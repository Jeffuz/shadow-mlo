import random
import time
from pathlib import Path

from .base import (
    BenchmarkResult,
    CompileResult,
    OptimizerBackend,
    OptimizationConfig,
    Precision,
    ValidationResult,
)

_LATENCY_BASE = {
    Precision.FP32:  100.0,
    Precision.FP16:   52.0,
    Precision.INT8:   28.0,
    Precision.FP8:    20.0,
    Precision.NVFP4:  14.0,
}

_ACCURACY_DELTA = {
    Precision.FP32:  0.0,
    Precision.FP16:  0.002,
    Precision.INT8:  0.045,
    Precision.FP8:   0.015,
    Precision.NVFP4: 0.025,
}

_MEMORY_MB = {
    Precision.FP32:  800.0,
    Precision.FP16:  420.0,
    Precision.INT8:  240.0,
    Precision.FP8:   200.0,
    Precision.NVFP4: 160.0,
}

_COMPILE_TIME = {
    Precision.FP32:  3.0,
    Precision.FP16:  5.0,
    Precision.INT8:  18.0,
    Precision.FP8:   22.0,
    Precision.NVFP4: 25.0,
}

_PER_CHANNEL_IMPROVEMENT = 0.025


class MockOptimizer(OptimizerBackend):
    def compile(self, onnx_path: Path, config: OptimizationConfig) -> CompileResult:
        time.sleep(0.5)
        engine_path = onnx_path.parent / f"{onnx_path.stem}_{config.label()}.engine"
        # Create a real file so the download endpoint can serve it
        engine_path.parent.mkdir(parents=True, exist_ok=True)
        engine_path.write_bytes(b"SHADOW_MLO_MOCK_ENGINE\x00" + onnx_path.read_bytes()[:256] if onnx_path.exists() else b"SHADOW_MLO_MOCK_ENGINE\x00")
        return CompileResult(
            config=config,
            success=True,
            engine_path=str(engine_path),
            compile_time_s=round(_COMPILE_TIME[config.precision] + random.uniform(-0.5, 0.5), 1),
        )

    def benchmark(self, engine_path: Path, config: OptimizationConfig) -> BenchmarkResult:
        time.sleep(0.3)
        base = _LATENCY_BASE[config.precision]
        jitter = random.uniform(-2.0, 2.0)
        latency_mean = base + jitter
        latency_p99 = latency_mean * random.uniform(1.05, 1.15)
        memory = _MEMORY_MB[config.precision] + random.uniform(-20, 20)
        return BenchmarkResult(
            config=config,
            latency_mean_ms=round(latency_mean, 1),
            latency_p99_ms=round(latency_p99, 1),
            throughput_fps=round(1000.0 / latency_mean, 1),
            memory_mb=round(memory, 1),
        )

    def validate(self, onnx_path: Path, engine_path: Path, config: OptimizationConfig) -> ValidationResult:
        time.sleep(0.2)
        delta = _ACCURACY_DELTA[config.precision]
        if config.precision == Precision.INT8 and config.per_channel:
            delta = max(0.0, delta - _PER_CHANNEL_IMPROVEMENT)
        delta += random.uniform(-0.003, 0.003)
        delta = max(0.0, delta)
        return ValidationResult(
            config=config,
            accuracy_delta=round(delta, 4),
            max_output_diff=round(delta * 2.5, 4),
            passed=delta < 0.03,
        )
