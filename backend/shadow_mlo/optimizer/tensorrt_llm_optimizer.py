import logging
import subprocess
import time
from pathlib import Path

from .base import BuildConfig, BuildResult, LLMOptimizerBackend, Precision

logger = logging.getLogger(__name__)

# trtllm-build is the TensorRT-LLM build tool on DGX OS
TRTLLM_BUILD = "trtllm-build"


class TensorRTLLMOptimizer(LLMOptimizerBackend):
    """
    Real TensorRT-LLM optimizer for DGX hardware.
    Calls trtllm-build to convert a Hugging Face checkpoint into a TRT-LLM engine.
    """

    def __init__(self, output_dir: str = "engines"):
        self._output_dir = Path(output_dir)
        self._output_dir.mkdir(parents=True, exist_ok=True)

    def build(self, artifact_path: Path, config: BuildConfig) -> BuildResult:
        engine_dir = self._output_dir / config.candidate_artifact(artifact_path.name)
        cmd = self._build_cmd(artifact_path, engine_dir, config)

        logger.info(f"trtllm-build: {' '.join(str(c) for c in cmd)}")
        start = time.perf_counter()

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=3600,
            )
            elapsed = time.perf_counter() - start

            if result.returncode != 0:
                return BuildResult(
                    config=config,
                    status="failed",
                    error=result.stderr[-800:],
                )

            latency, throughput, memory = self._benchmark(engine_dir, artifact_path)

            return BuildResult(
                config=config,
                status="success",
                latency_ms_per_token=latency,
                throughput_toks_per_sec=throughput,
                memory_gb=memory,
                quality_pct=None,   # requires separate eval run
                artifact_path=str(engine_dir),
            )

        except subprocess.TimeoutExpired:
            return BuildResult(
                config=config,
                status="failed",
                error="trtllm-build timed out after 1 hour",
            )
        except Exception as e:
            return BuildResult(config=config, status="failed", error=str(e))

    def _build_cmd(self, artifact_path: Path, engine_dir: Path, config: BuildConfig) -> list:
        cmd = [
            TRTLLM_BUILD,
            "--model_dir", str(artifact_path),
            "--output_dir", str(engine_dir),
            "--max_batch_size", "1",
            "--max_input_len", "1024",
            "--max_seq_len", "2048",
        ]
        if config.precision == Precision.BF16:
            cmd += ["--dtype", "bfloat16"]
        elif config.precision == Precision.FP16:
            cmd += ["--dtype", "float16"]
        elif config.precision == Precision.INT8:
            cmd += ["--dtype", "bfloat16", "--use_weight_only", "--weight_only_precision", "int8"]
        elif config.precision == Precision.FP8:
            cmd += ["--dtype", "bfloat16", "--use_fp8_rowwise"]
        elif config.precision == Precision.NVFP4:
            cmd += ["--dtype", "bfloat16", "--use_weight_only", "--weight_only_precision", "nvfp4"]
        return cmd

    def _benchmark(self, engine_dir: Path, artifact_path: Path) -> tuple[float, float, float]:
        """Run a quick benchmark with trtllm-bench. Returns (latency_ms, tok_per_sec, mem_gb)."""
        try:
            result = subprocess.run(
                [
                    "trtllm-bench",
                    "--engine_dir", str(engine_dir),
                    "--max_num_tokens", "128",
                    "--num_requests", "10",
                ],
                capture_output=True,
                text=True,
                timeout=120,
            )
            output = result.stdout + result.stderr
            latency = _parse_metric(output, "latency_per_output_token") or 0.0
            throughput = _parse_metric(output, "output_tokens_per_second") or 0.0
            memory = _parse_metric(output, "gpu_memory") or 0.0
            return round(latency, 1), round(throughput, 1), round(memory / 1024, 1)
        except Exception as e:
            logger.warning(f"Benchmark failed: {e}")
            return 0.0, 0.0, 0.0


def _parse_metric(output: str, label: str) -> float:
    import re
    pattern = rf"{re.escape(label)}[^\d]*?([\d.]+)"
    match = re.search(pattern, output, re.IGNORECASE)
    return float(match.group(1)) if match else 0.0
