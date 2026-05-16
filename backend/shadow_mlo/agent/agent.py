import json
import logging
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Optional

import httpx

from shadow_mlo import events
from shadow_mlo.inspector.artifact_inspector import ArtifactMetadata, inspect
from shadow_mlo.jobs import (
    Candidate,
    Classification,
    DeviceProfile,
    Job,
    Recommendation,
    TimelineEvent,
    make_initial_timeline,
    make_job_id,
)
from shadow_mlo.optimizer.base import (
    CandidateResult,
    OptimizationConfig,
    OptimizerBackend,
    Precision,
)
from shadow_mlo.registry.registry import JobRegistry

logger = logging.getLogger(__name__)

NEMOTRON_BASE_URL = os.getenv("NEMOTRON_BASE_URL", "https://integrate.api.nvidia.com/v1")
NEMOTRON_API_KEY  = os.getenv("NEMOTRON_API_KEY", "")
NEMOTRON_MODEL    = os.getenv("NEMOTRON_MODEL", "nvidia/llama-3.1-nemotron-nano-8b-v1")

MAX_ITERATIONS    = 4
ACCURACY_THRESHOLD = 0.03


def _now() -> str:
    return datetime.now().strftime("%H:%M:%S")


# ── Nemotron helpers ──────────────────────────────────────────────────────────

def _chat(messages: list[dict], temperature: float = 0.3) -> str:
    if not NEMOTRON_API_KEY:
        return ""
    headers = {"Authorization": f"Bearer {NEMOTRON_API_KEY}", "Content-Type": "application/json"}
    payload = {"model": NEMOTRON_MODEL, "messages": messages, "temperature": temperature, "max_tokens": 1024}
    try:
        with httpx.Client(timeout=60) as client:
            resp = client.post(f"{NEMOTRON_BASE_URL}/chat/completions", headers=headers, json=payload)
            resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.warning(f"Nemotron chat failed: {e}")
        return ""


def _extract_json(text: str):
    for pattern in (r'\[.*?\]', r'\{.*?\}'):
        m = re.search(pattern, text, re.DOTALL)
        if m:
            return json.loads(m.group())
    return json.loads(text)


def _extract_reasoning(response: str) -> str:
    clean = re.sub(r'[\[\{].*?[\]\}]', '', response, flags=re.DOTALL)
    clean = re.sub(r'\s+', ' ', clean).strip().strip('.,')
    return clean if len(clean) > 10 else ""


# ── Nemotron: pick initial configs ────────────────────────────────────────────

def _initial_configs(
    metadata: ArtifactMetadata,
    past_wins: list[dict],
    hardware_display: str,
    supported_precisions: list[str],
) -> tuple[list[OptimizationConfig], list[str]]:
    """Ask Nemotron which configs to try. Returns (configs, plan_lines)."""
    past_summary = json.dumps(past_wins, indent=2) if past_wins else "No prior runs for this model type."
    precisions_str = ", ".join(f'"{p}"' for p in supported_precisions)

    prompt = f"""You are an ML optimization expert. Given this ONNX model metadata, decide which TensorRT optimization configs to try first.

Model: {metadata.summary()}
Op types: {metadata.op_types}
Past winning configs for similar {metadata.likely_type} models:
{past_summary}

First write 1-2 sentences explaining your reasoning. Then return a JSON array of configs.
Each config: {{"precision": one of {precisions_str}, "calibration_algo": "entropy"|"percentile"|"max", "per_channel": true|false}}

Rules:
- Always include fp16 as a baseline.
- Include int8 if the model is cnn or cnn_classifier.
- Only use precisions from the supported list above.
- Maximum 3 configs in the first round.
Hardware: {hardware_display}"""

    response = _chat([{"role": "user", "content": prompt}])
    reasoning = _extract_reasoning(response) if response else ""

    configs: list[OptimizationConfig] = []
    if response:
        try:
            raw = _extract_json(response)
            for item in raw:
                configs.append(OptimizationConfig(
                    precision=Precision(item["precision"]),
                    calibration_algo=item.get("calibration_algo", "entropy"),
                    per_channel=item.get("per_channel", False),
                ))
        except Exception as e:
            logger.warning(f"Failed to parse Nemotron configs: {e}")

    if not configs:
        configs = [OptimizationConfig(Precision.FP16), OptimizationConfig(Precision.INT8)]
        reasoning = reasoning or "Defaulting to FP16 and INT8 baselines."

    plan = _build_plan(metadata, configs, supported_precisions, reasoning)
    return configs, plan


def _build_plan(
    metadata: ArtifactMetadata,
    configs: list[OptimizationConfig],
    supported_precisions: list[str],
    reasoning: str,
) -> list[str]:
    plan = [
        f"Use TensorRT route because artifact is ONNX-based.",
        f"Establish FP32 baseline for quality reference and speedup calculation.",
    ]
    if reasoning:
        plan.append(reasoning)
    for cfg in configs:
        if cfg.precision == Precision.FP16:
            plan.append("Try FP16 — widely supported and low accuracy risk.")
        elif cfg.precision == Precision.INT8:
            suffix = " with per-channel calibration" if cfg.per_channel else f" ({cfg.calibration_algo} calibration)"
            plan.append(f"Try INT8{suffix} — improves memory and throughput for {metadata.likely_type} models.")
        elif cfg.precision == Precision.FP8:
            plan.append("Try FP8 — better throughput than INT8 on Ada/Hopper/Blackwell.")
        elif cfg.precision == Precision.NVFP4:
            plan.append("Try NVFP4 if hardware support is detected.")
    plan.append("Benchmark latency, throughput, memory, and output similarity vs FP32 baseline.")
    return plan


# ── Nemotron: decide next config ──────────────────────────────────────────────

def _next_config(
    metadata: ArtifactMetadata,
    results_so_far: list[CandidateResult],
) -> Optional[OptimizationConfig]:
    results_summary = []
    for r in results_so_far:
        entry = {"config": r.compile.config.label(), "compile_ok": r.compile.success}
        if r.benchmark:
            entry["latency_ms"] = r.benchmark.latency_mean_ms
            entry["memory_mb"] = r.benchmark.memory_mb
        if r.validation:
            entry["accuracy_delta"] = r.validation.accuracy_delta
            entry["val_passed"] = r.validation.passed
        results_summary.append(entry)

    prompt = f"""You are an ML optimization expert reviewing TensorRT benchmark results.

Model: {metadata.summary()}
Results so far:
{json.dumps(results_summary, indent=2)}
Accuracy threshold: {ACCURACY_THRESHOLD}

Decide what to try next. Write 1-2 sentences reasoning.
Then return a JSON object:
{{"precision": "fp32"|"fp16"|"int8"|"fp8"|"nvfp4", "calibration_algo": "entropy"|"percentile"|"max", "per_channel": true|false, "reason": "one sentence"}}

Or if done: {{"done": true, "reason": "one sentence"}}"""

    response = _chat([{"role": "user", "content": prompt}])
    if not response:
        return None
    try:
        parsed = _extract_json(response)
        if parsed.get("done"):
            return None
        return OptimizationConfig(
            precision=Precision(parsed["precision"]),
            calibration_algo=parsed.get("calibration_algo", "entropy"),
            per_channel=parsed.get("per_channel", False),
        )
    except Exception as e:
        logger.warning(f"Failed to parse next config: {e}")
        return None


# ── Winner selection ──────────────────────────────────────────────────────────

def _pick_winner(results: list[CandidateResult]) -> CandidateResult:
    passed = [r for r in results if not r.failed() and r.validation and r.validation.passed]
    if not passed:
        passed = [r for r in results if not r.failed()]
    if not passed:
        return results[0]
    return min(passed, key=lambda r: r.benchmark.latency_mean_ms if r.benchmark else float("inf"))


def _write_narrative(
    metadata: ArtifactMetadata,
    results: list[CandidateResult],
    winner: CandidateResult,
) -> str:
    summary = []
    for r in results:
        e = {"config": r.compile.config.label(), "compile_ok": r.compile.success}
        if r.benchmark:
            e["latency_ms"] = r.benchmark.latency_mean_ms
            e["memory_mb"] = r.benchmark.memory_mb
        if r.validation:
            e["accuracy_delta"] = r.validation.accuracy_delta
        summary.append(e)

    prompt = f"""Write a 2-3 sentence deployment recommendation for an ML engineer.

Model: {metadata.summary()}
Winner: {winner.compile.config.label()}
All results: {json.dumps(summary, indent=2)}

Explain why the winner was chosen, key tradeoffs vs alternatives, and any caveats.
Be direct and specific. No fluff."""

    response = _chat([{"role": "user", "content": prompt}], temperature=0.5)
    return response or (
        f"{winner.compile.config.display_name()} gives the best latency/memory tradeoff "
        f"while staying within the quality threshold."
    )


# ── Main agent ────────────────────────────────────────────────────────────────

class ShadowAgent:
    def __init__(
        self,
        optimizer: OptimizerBackend,
        registry: JobRegistry,
        hardware_profile,
        owner: str = "se_engineer",
    ):
        self._optimizer = optimizer
        self._registry = registry
        self._hw = hardware_profile
        self._owner = owner

    def run(self, model_path: Path) -> Job:
        job = self._init_job(model_path)
        self._save_and_broadcast(job)
        try:
            job = self._run_pipeline(job, model_path)
        except Exception as e:
            logger.error(f"Pipeline failed for {model_path.name}: {e}", exc_info=True)
            job.status = "failed"
            job.stage = "failed"
            job.add_event("pipeline", str(e), "failed")
            self._set_timeline(job, "detected", "failed")
            self._save_and_broadcast(job)
            events.broadcast("pipeline_error", {"job_id": job.id, "error": str(e)})
        return job

    def _run_pipeline(self, job: Job, model_path: Path) -> Job:
        # ── Detected ──────────────────────────────────────────────────────────
        job.stage = "artifact_detected"
        job.add_event("watcher", f"Detected {model_path.name} in models/", "success")
        self._set_timeline(job, "detected", "success", _now())
        self._save_and_broadcast(job)

        # ── Classify ──────────────────────────────────────────────────────────
        self._set_timeline(job, "classified", "running")
        self._save_and_broadcast(job)

        metadata = inspect(model_path)
        logger.info(f"Classified : {metadata.summary()}")
        job.stage = "classified"
        job.add_event("classify_artifact", f"Classified as {metadata.model_family} / {metadata.likely_type}", "success")
        job.artifactType  = metadata.artifact_type
        job.modelFamily   = metadata.model_family
        job.classification = Classification(
            format=metadata.artifact_type,
            family=metadata.model_family,
            parameters=metadata.parameters_str,
            contextLength=metadata.input_shape_str,
            precision="FP32",
            runtimePath="TensorRT",
        )
        self._set_timeline(job, "classified", "success", _now())
        self._save_and_broadcast(job)

        # ── Device profile ────────────────────────────────────────────────────
        self._set_timeline(job, "profile", "running")
        self._save_and_broadcast(job)

        job.deviceProfile = DeviceProfile(
            name=self._hw.name,
            cuda=self._hw.cuda,
            tensorrt=self._hw.tensorrt,
            tensorrtLlm=False,
            supportedPrecisions=self._hw.supported_precisions,
            memoryBudget=self._hw.memory_budget,
        )
        logger.info(f"Device     : {self._hw.display_name} | precisions: {self._hw.supported_precisions}")
        job.stage = "device_profile_loaded"
        job.add_event("device_profile", f"Loaded profile for {self._hw.display_name}", "success")
        self._set_timeline(job, "profile", "success", _now())
        self._save_and_broadcast(job)

        # ── Plan (Nemotron) ───────────────────────────────────────────────────
        self._set_timeline(job, "planned", "running")
        self._save_and_broadcast(job)

        past_wins = self._registry.get_similar_model_wins(metadata.likely_type)
        logger.info(f"Planning   : {len(past_wins)} prior win(s) for {metadata.likely_type} models")
        configs, plan = _initial_configs(
            metadata, past_wins, self._hw.display_name, self._hw.supported_precisions
        )
        logger.info(f"Plan       : {[c.label() for c in configs]}")
        for line in plan:
            logger.info(f"  > {line}")
        job.plan = plan
        job.stage = "plan_generated"
        job.add_event("nemotron_planner", f"Generated plan: {[c.label() for c in configs]}", "success", "agent_plan")
        self._set_timeline(job, "planned", "success", _now())
        self._save_and_broadcast(job)

        # ── FP32 baseline ─────────────────────────────────────────────────────
        job.stage = "building_candidates"
        job.add_event("run_candidate_builds", "Starting candidate builds", "running")
        self._set_timeline(job, "building", "running")
        logger.info("Building   : fp32 baseline")
        fp32_config = OptimizationConfig(Precision.FP32)
        fp32_result = self._run_candidate(job, model_path, metadata, fp32_config)
        fp32_latency = fp32_result.benchmark.latency_mean_ms if fp32_result.benchmark else None
        fp32_memory  = fp32_result.benchmark.memory_mb if fp32_result.benchmark else None
        if fp32_result.benchmark:
            logger.info(f"  fp32     : {fp32_latency} ms | {fp32_memory} MB")

        all_results: list[CandidateResult] = [fp32_result]
        tried: set[str] = {"fp32"}

        # ── Nemotron-selected candidates ──────────────────────────────────────
        for config in configs:
            if config.label() in tried:
                continue
            tried.add(config.label())
            logger.info(f"Building   : {config.label()}")
            result = self._run_candidate(job, model_path, metadata, config)
            if result.benchmark:
                logger.info(f"  {config.label():<10}: {result.benchmark.latency_mean_ms} ms | {result.benchmark.memory_mb} MB | delta={result.validation.accuracy_delta if result.validation else '—'}")
            all_results.append(result)
            self._registry.save_run(metadata.sha256, metadata.likely_type, config, result)

        # ── Nemotron: iterate ─────────────────────────────────────────────────
        for _ in range(MAX_ITERATIONS - len(tried)):
            next_cfg = _next_config(metadata, all_results)
            if next_cfg is None or next_cfg.label() in tried:
                break
            tried.add(next_cfg.label())
            logger.info(f"Building   : {next_cfg.label()} (Nemotron suggestion)")
            result = self._run_candidate(job, model_path, metadata, next_cfg)
            if result.benchmark:
                logger.info(f"  {next_cfg.label():<10}: {result.benchmark.latency_mean_ms} ms | {result.benchmark.memory_mb} MB | delta={result.validation.accuracy_delta if result.validation else '—'}")
            all_results.append(result)
            self._registry.save_run(metadata.sha256, metadata.likely_type, next_cfg, result)

        self._set_timeline(job, "building", "success", _now())
        self._set_timeline(job, "benchmark", "success", _now())
        self._save_and_broadcast(job)

        # ── Report ────────────────────────────────────────────────────────────
        self._set_timeline(job, "report", "running")
        self._save_and_broadcast(job)

        winner = _pick_winner(all_results)
        job.stage = "quality_check"
        job.add_event("report", f"Winner: {winner.compile.config.label()}", "running")
        logger.info(f"Winner     : {winner.compile.config.label()}")
        narrative = _write_narrative(metadata, all_results, winner)

        speedup = (
            round(fp32_latency / winner.benchmark.latency_mean_ms, 1)
            if fp32_latency and winner.benchmark and winner.benchmark.latency_mean_ms
            else None
        )
        mem_reduction = (
            round((1 - winner.benchmark.memory_mb / fp32_memory) * 100)
            if fp32_memory and winner.benchmark and winner.benchmark.memory_mb
            else None
        )

        job.recommendation = Recommendation(
            candidate=winner.compile.config.display_name(),
            artifact=winner.compile.engine_path or "",
            reason=narrative,
            speedup=f"{speedup:g}x" if speedup else "1x",
            quality=f"{winner.similarity_pct():g}%" if winner.similarity_pct() else "—",
            memoryReduction=f"{mem_reduction}%" if mem_reduction is not None else "—",
        )

        self._registry.save_recommendation(metadata.sha256, metadata.likely_type, winner.compile.config, narrative)
        logger.info(f"Speedup    : {job.recommendation.speedup} | memory reduction: {job.recommendation.memoryReduction} | quality: {job.recommendation.quality}")
        logger.info(f"Narrative  : {narrative}")
        logger.info(f"Done       : job {job.id} completed")
        job.stage = "completed"
        job.add_event("report", "Optimization report complete", "success")
        job.status = "completed"
        self._set_timeline(job, "report", "success", _now())
        self._save_and_broadcast(job)
        events.broadcast("job_completed", {"job_id": job.id})
        return job

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _run_candidate(
        self,
        job: Job,
        model_path: Path,
        metadata: ArtifactMetadata,
        config: OptimizationConfig,
    ) -> CandidateResult:
        name = config.display_name()
        self._upsert_candidate(job, name, config, "running")
        self._save_and_broadcast(job)

        compile_result = self._optimizer.compile(model_path, config)
        benchmark_result = None
        validation_result = None

        if compile_result.success:
            engine_path = Path(compile_result.engine_path)
            benchmark_result  = self._optimizer.benchmark(engine_path, config)
            validation_result = self._optimizer.validate(model_path, engine_path, config)

        result = CandidateResult(
            compile=compile_result,
            benchmark=benchmark_result,
            validation=validation_result,
        )
        self._upsert_candidate(job, name, config, "success" if compile_result.success else "failed", result)
        self._save_and_broadcast(job)
        return result

    def _upsert_candidate(
        self,
        job: Job,
        name: str,
        config: OptimizationConfig,
        status: str,
        result: Optional[CandidateResult] = None,
    ):
        for c in job.candidates:
            if isinstance(c, Candidate) and c.name == name:
                c.status = status
                if result and not result.failed():
                    b = result.benchmark
                    v = result.validation
                    c.latency    = f"{b.latency_mean_ms:g} ms" if b else None
                    c.throughput = f"{b.throughput_fps:g} fps" if b else None
                    c.memory     = f"{b.memory_mb:g} MB" if b else None
                    c.quality    = f"{result.similarity_pct():g}%" if result.similarity_pct() else None
                    c.artifact   = result.compile.engine_path
                return
        # Not found — add new
        job.candidates.append(Candidate(name=name, runtime="TensorRT", status=status))

    def _init_job(self, model_path: Path) -> Job:
        return Job(
            id=make_job_id(),
            artifactName=model_path.name,
            artifactType="ONNX",
            modelFamily="Unknown",
            runtimePath="TensorRT",
            targetDevice=self._hw.name,
            status="running",
            startedAt=datetime.now().strftime("%I:%M:%S %p"),
            owner=self._owner,
            timeline=make_initial_timeline(),
            candidates=[],
        )

    def _set_timeline(self, job: Job, stage_id: str, status: str, timestamp: str = None):
        for event in job.timeline:
            if isinstance(event, TimelineEvent) and event.id == stage_id:
                event.status = status
                if timestamp:
                    event.timestamp = timestamp
                break

    def _save_and_broadcast(self, job: Job):
        job.updatedAt = _now()
        job_dict = job.to_dict()
        self._registry.save_job(job_dict)
        events.broadcast("job_updated", {"job_id": job.id, "job": job_dict})
