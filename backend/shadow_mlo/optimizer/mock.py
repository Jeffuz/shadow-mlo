import random
import time
from pathlib import Path

from .base import BuildConfig, BuildResult, LLMOptimizerBackend, Precision

# Realistic DGX Spark latency (ms/token) per precision
_LATENCY = {
    Precision.BF16:  42.0,
    Precision.FP16:  38.5,
    Precision.INT8:  26.0,
    Precision.FP8:   18.0,
    Precision.NVFP4: 12.0,
}

# Tokens per second
_THROUGHPUT = {
    Precision.BF16:  23.1,
    Precision.FP16:  26.0,
    Precision.INT8:  38.4,
    Precision.FP8:   55.6,
    Precision.NVFP4: 83.3,
}

# Memory footprint (GB)
_MEMORY_GB = {
    Precision.BF16:  9.8,
    Precision.FP16:  9.8,
    Precision.INT8:  6.1,
    Precision.FP8:   5.2,
    Precision.NVFP4: 3.8,
}

# Quality relative to BF16 baseline (%)
_QUALITY = {
    Precision.BF16:  100.0,
    Precision.FP16:   99.8,
    Precision.INT8:   98.7,
    Precision.FP8:    99.1,
    Precision.NVFP4:  97.9,
}

# Simulated build time (seconds)
_BUILD_TIME = {
    Precision.BF16:  2.0,
    Precision.FP16:  2.5,
    Precision.INT8:  4.5,
    Precision.FP8:   5.5,
    Precision.NVFP4: 7.0,
}


class MockLLMOptimizer(LLMOptimizerBackend):
    """
    Simulates TensorRT-LLM builds with realistic latency and quality numbers.
    Used when TensorRT-LLM is not installed or no DGX hardware is present.
    """

    def build(self, artifact_path: Path, config: BuildConfig) -> BuildResult:
        build_time = _BUILD_TIME[config.precision] + random.uniform(-0.3, 0.5)
        time.sleep(build_time)

        jitter = random.uniform(-0.03, 0.03)
        latency = _LATENCY[config.precision] * (1 + jitter)
        throughput = _THROUGHPUT[config.precision] * (1 - jitter)
        memory = _MEMORY_GB[config.precision] * (1 + random.uniform(-0.05, 0.05))
        # BF16 is the quality reference — always 100%; others are relative to it
        if config.precision == Precision.BF16:
            quality = 100.0
        else:
            quality = _QUALITY[config.precision] + random.uniform(-0.4, 0.1)
            quality = min(99.9, max(90.0, quality))

        artifact = config.candidate_artifact(artifact_path.name)

        return BuildResult(
            config=config,
            status="success",
            latency_ms_per_token=round(latency, 1),
            throughput_toks_per_sec=round(throughput, 1),
            memory_gb=round(memory, 1),
            quality_pct=round(quality, 1),
            artifact_path=artifact,
        )
