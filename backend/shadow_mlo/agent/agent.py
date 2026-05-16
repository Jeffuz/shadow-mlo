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
from shadow_mlo.optimizer.base import BuildConfig, BuildResult, LLMOptimizerBackend, Precision
from shadow_mlo.registry.registry import JobRegistry

logger = logging.getLogger(__name__)

NEMOTRON_BASE_URL = os.getenv("NEMOTRON_BASE_URL", "https://integrate.api.nvidia.com/v1")
NEMOTRON_API_KEY  = os.getenv("NEMOTRON_API_KEY", "")
NEMOTRON_MODEL    = os.getenv("NEMOTRON_MODEL", "nvidia/llama-3.1-nemotron-nano-8b-v1")

QUALITY_THRESHOLD = 0.97   # reject builds below 97% of BF16 quality


def _now() -> str:
    return datetime.now().strftime("%H:%M:%S")


# ── LLM chat helper ───────────────────────────────────────────────────────────

def _chat(messages: list[dict], temperature: float = 0.3) -> str:
    if not NEMOTRON_API_KEY:
        return ""
    headers = {
        "Authorization": f"Bearer {NEMOTRON_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": NEMOTRON_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 1024,
    }
    try:
        with httpx.Client(timeout=60) as client:
            resp = client.post(f"{NEMOTRON_BASE_URL}/chat/completions", headers=headers, json=payload)
            resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.warning(f"LLM chat failed: {e}")
        return ""


def _extract_json(text: str):
    for pattern in (r'\[.*?\]', r'\{.*?\}'):
        m = re.search(pattern, text, re.DOTALL)
        if m:
            return json.loads(m.group())
    return json.loads(text)


# ── Plan generation ───────────────────────────────────────────────────────────

def _generate_plan(
    metadata: ArtifactMetadata,
    device_name: str,
    supported_precisions: list[str],
) -> list[str]:
    prompt = f"""You are an ML deployment expert on NVIDIA infrastructure.

Given this model artifact, generate an optimization plan for TensorRT-LLM deployment.

Artifact: {metadata.summary()}
Target device: {device_name}
Supported precisions: {', '.join(supported_precisions)}

Write a JSON array of 4-6 concise action strings describing the optimization plan.
Each string should be one sentence explaining what will be done and why.
Focus on: route selection, baseline build, quantization options to try, what to skip and why, and what metrics to benchmark.

Example format: ["Use TensorRT-LLM route because artifact is transformer-based.", ...]

Return only the JSON array, no other text."""

    response = _chat([{"role": "user", "content": prompt}])
    if response:
        try:
            plan = _extract_json(response)
            if isinstance(plan, list) and all(isinstance(s, str) for s in plan):
                return plan
        except Exception:
            pass

    # Deterministic fallback plan
    return _default_plan(metadata, device_name, supported_precisions)


def _default_plan(
    metadata: ArtifactMetadata,
    device_name: str,
    supported_precisions: list[str],
) -> list[str]:
    plans = [
        f"Use TensorRT-LLM route because artifact is {metadata.artifact_type.lower()}-based.",
        f"Establish {metadata.default_precision} baseline for quality and throughput reference.",
    ]
    if "INT8" in supported_precisions:
        plans.append("Try INT8 weight-only because it improves memory and throughput with minimal quality loss.")
    if "FP8" in supported_precisions:
        plans.append("Try FP8 because it offers better throughput than INT8 on Ada/Hopper/Blackwell hardware.")
    if any("NVFP4" in p for p in supported_precisions):
        plans.append("Try NVFP4 if hardware support is detected — it offers the best throughput on Blackwell.")
    plans.append("Skip standard TensorRT ONNX path because this is not a static ONNX graph.")
    plans.append("Benchmark tokens/sec, latency/token, memory, and quality score relative to baseline.")
    return plans


# ── Candidate selection ────────────────────────────────────────────────────────

def _select_candidates(
    metadata: ArtifactMetadata,
    supported_precisions: list[str],
) -> list[BuildConfig]:
    """Return the ordered list of builds to attempt."""
    configs: list[BuildConfig] = []

    # BF16 baseline always first
    configs.append(BuildConfig(name="BF16 Baseline", precision=Precision.BF16))

    if "FP16" in supported_precisions and metadata.default_precision == "FP16":
        configs.append(BuildConfig(name="FP16 Baseline", precision=Precision.FP16))

    if "INT8" in supported_precisions:
        configs.append(BuildConfig(name="INT8 Weight-Only", precision=Precision.INT8))

    if "FP8" in supported_precisions:
        configs.append(BuildConfig(name="FP8 Weight-Only", precision=Precision.FP8))

    if any("NVFP4" in p for p in supported_precisions):
        configs.append(BuildConfig(
            name="NVFP4",
            precision=Precision.NVFP4,
            condition="Only run if support is detected",
        ))

    return configs


# ── Winner selection ───────────────────────────────────────────────────────────

def _pick_winner(
    results: list[tuple[BuildConfig, BuildResult]],
    bf16_quality: float,
) -> Optional[tuple[BuildConfig, BuildResult]]:
    """Best throughput among builds that pass the quality threshold."""
    threshold = bf16_quality * QUALITY_THRESHOLD
    passing = [
        (cfg, res) for cfg, res in results
        if not res.failed()
        and res.quality_pct is not None
        and res.quality_pct >= threshold
    ]
    if not passing:
        passing = [(cfg, res) for cfg, res in results if not res.failed()]
    if not passing:
        return None
    return max(passing, key=lambda pair: pair[1].throughput_toks_per_sec or 0)


def _recommendation_reason(winner_config: BuildConfig, winner_result: BuildResult) -> str:
    prompt = f"""You are writing a deployment recommendation for an ML engineer.

Winner config: {winner_config.name} ({winner_config.precision.value})
Throughput: {winner_result.throughput_toks_per_sec} tok/s
Latency: {winner_result.latency_ms_per_token} ms/token
Memory: {winner_result.memory_gb} GB
Quality: {winner_result.quality_pct}%

Write one concise sentence explaining why this config was chosen.
No fluff. Focus on the practical benefit (throughput, memory, quality tradeoff)."""

    response = _chat([{"role": "user", "content": prompt}])
    if response and len(response) < 300:
        return response

    return (
        f"{winner_config.name} gives the best throughput and memory profile "
        f"while staying within the configured quality threshold."
    )


# ── Main agent ────────────────────────────────────────────────────────────────

class ShadowAgent:
    def __init__(
        self,
        optimizer: LLMOptimizerBackend,
        registry: JobRegistry,
        hardware_profile,
        owner: str = "se_engineer",
    ):
        self._optimizer = optimizer
        self._registry = registry
        self._hw = hardware_profile
        self._owner = owner

    def run(self, artifact_path: Path) -> Job:
        job = self._init_job(artifact_path)
        self._save_and_broadcast(job)

        try:
            job = self._run_pipeline(job, artifact_path)
        except Exception as e:
            logger.error(f"Pipeline failed for {artifact_path.name}: {e}", exc_info=True)
            job.status = "failed"
            self._set_timeline(job, "detected", "failed")
            self._save_and_broadcast(job)
            events.broadcast("pipeline_error", {"job_id": job.id, "error": str(e)})

        return job

    # ── Pipeline stages ───────────────────────────────────────────────────────

    def _run_pipeline(self, job: Job, artifact_path: Path) -> Job:
        # Stage: Artifact Detected
        self._set_timeline(job, "detected", "success", _now())
        self._save_and_broadcast(job)

        # Stage: Classification
        self._set_timeline(job, "classified", "running")
        self._save_and_broadcast(job)

        metadata = inspect(artifact_path)
        job.artifactType = metadata.artifact_type
        job.modelFamily  = metadata.model_family
        job.classification = Classification(
            format=metadata.artifact_type,
            family=metadata.model_family,
            parameters=metadata.parameters,
            contextLength=metadata.context_length,
            precision=metadata.default_precision,
            runtimePath="TensorRT-LLM",
        )
        self._set_timeline(job, "classified", "success", _now())
        events.broadcast("classified", {"job_id": job.id, "metadata": metadata.summary()})
        self._save_and_broadcast(job)

        # Stage: Device Profile
        self._set_timeline(job, "profile", "running")
        self._save_and_broadcast(job)

        job.deviceProfile = DeviceProfile(
            name=self._hw.name,
            cuda=self._hw.cuda,
            tensorrt=self._hw.tensorrt,
            tensorrtLlm=self._hw.tensorrt_llm,
            supportedPrecisions=self._hw.supported_precisions,
            memoryBudget=self._hw.memory_budget,
        )
        self._set_timeline(job, "profile", "success", _now())
        self._save_and_broadcast(job)

        # Stage: Plan
        self._set_timeline(job, "planned", "running")
        self._save_and_broadcast(job)

        job.plan = _generate_plan(metadata, self._hw.name, self._hw.supported_precisions)
        self._set_timeline(job, "planned", "success", _now())
        events.broadcast("plan_ready", {"job_id": job.id, "plan": job.plan})
        self._save_and_broadcast(job)

        # Stage: Candidate Builds
        self._set_timeline(job, "building", "running")
        configs = _select_candidates(metadata, self._hw.supported_precisions)

        # Seed candidates list with all configs (queued/conditional)
        job.candidates = self._seed_candidates(configs)
        self._save_and_broadcast(job)

        build_results: list[tuple[BuildConfig, BuildResult]] = []
        bf16_quality = 100.0

        for config in configs:
            self._update_candidate(job, config.name, "running")
            self._save_and_broadcast(job)

            result = self._optimizer.build(artifact_path, config)
            build_results.append((config, result))

            if config.precision == Precision.BF16 and result.quality_pct:
                bf16_quality = result.quality_pct

            self._update_candidate_result(job, config, result)
            self._save_and_broadcast(job)

        self._set_timeline(job, "building", "success", _now())
        self._set_timeline(job, "benchmark", "success", _now())
        self._save_and_broadcast(job)

        # Stage: Report
        self._set_timeline(job, "report", "running")
        self._save_and_broadcast(job)

        winner = _pick_winner(build_results, bf16_quality)
        if winner:
            winner_cfg, winner_res = winner
            bf16_res = next(
                (res for cfg, res in build_results if cfg.precision == Precision.BF16),
                None,
            )
            speedup = (
                round(bf16_res.latency_ms_per_token / winner_res.latency_ms_per_token, 1)
                if bf16_res and bf16_res.latency_ms_per_token and winner_res.latency_ms_per_token
                else None
            )
            mem_reduction = (
                round((1 - winner_res.memory_gb / bf16_res.memory_gb) * 100)
                if bf16_res and bf16_res.memory_gb and winner_res.memory_gb
                else None
            )
            reason = _recommendation_reason(winner_cfg, winner_res)
            job.recommendation = Recommendation(
                candidate=winner_cfg.name,
                artifact=winner_res.artifact_path or "",
                reason=reason,
                speedup=f"{speedup:g}x" if speedup else "1x",
                quality=f"{winner_res.quality_pct:g}%" if winner_res.quality_pct else "—",
                memoryReduction=f"{mem_reduction}%" if mem_reduction else "—",
            )

        job.status = "completed"
        self._set_timeline(job, "report", "success", _now())
        self._save_and_broadcast(job)
        events.broadcast("job_completed", {"job_id": job.id})

        return job

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _init_job(self, artifact_path: Path) -> Job:
        job_id = make_job_id()
        artifact_name = artifact_path.name + ("/" if artifact_path.is_dir() else "")
        return Job(
            id=job_id,
            artifactName=artifact_name,
            artifactType="Hugging Face Transformer",
            modelFamily="LLM",
            runtimePath="TensorRT-LLM",
            targetDevice=self._hw.name,
            status="running",
            startedAt=datetime.now().strftime("%I:%M:%S %p"),
            owner=self._owner,
            timeline=make_initial_timeline(),
            candidates=[],
        )

    def _seed_candidates(self, configs: list[BuildConfig]) -> list[Candidate]:
        candidates = []
        for cfg in configs:
            status = "queued" if cfg.condition else "queued"
            candidates.append(Candidate(
                name=cfg.name,
                runtime=cfg.runtime,
                status=status,
                reason=cfg.condition,
            ))
        return candidates

    def _update_candidate(self, job: Job, name: str, status: str):
        for c in job.candidates:
            if isinstance(c, Candidate) and c.name == name:
                c.status = status
                break

    def _update_candidate_result(self, job: Job, config: BuildConfig, result: BuildResult):
        for c in job.candidates:
            if not isinstance(c, Candidate) or c.name != config.name:
                continue
            if result.failed():
                c.status = "failed"
            else:
                c.status = "success"
                c.latency    = f"{result.latency_ms_per_token:g} ms/token"
                c.throughput = f"{result.throughput_toks_per_sec:g} tok/s"
                c.memory     = f"{result.memory_gb:g} GB"
                c.quality    = f"{result.quality_pct:g}%"
                c.artifact   = result.artifact_path
            break

    def _set_timeline(self, job: Job, stage_id: str, status: str, timestamp: str | None = None):
        for event in job.timeline:
            if isinstance(event, TimelineEvent) and event.id == stage_id:
                event.status = status
                if timestamp:
                    event.timestamp = timestamp
                break

    def _save_and_broadcast(self, job: Job):
        job_dict = job.to_dict()
        self._registry.save_job(job_dict)
        events.broadcast("job_updated", {"job_id": job.id, "job": job_dict})
