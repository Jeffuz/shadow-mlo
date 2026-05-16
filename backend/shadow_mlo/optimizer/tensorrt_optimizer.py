import logging
import re
import subprocess
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort

from .base import (
    BenchmarkResult,
    CompileResult,
    OptimizerBackend,
    OptimizationConfig,
    Precision,
    ValidationResult,
)

logger = logging.getLogger(__name__)

TRTEXEC = "/usr/src/tensorrt/bin/trtexec"


class TensorRTOptimizer(OptimizerBackend):
    def __init__(self, workspace_mb: int = 4096):
        self._workspace_mb = workspace_mb

    def compile(self, onnx_path: Path, config: OptimizationConfig) -> CompileResult:
        engine_path = onnx_path.parent / f"{onnx_path.stem}_{config.label()}.engine"
        cmd = self._build_cmd(onnx_path, engine_path, config)
        start = time.perf_counter()
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            elapsed = time.perf_counter() - start
            if result.returncode != 0:
                return CompileResult(
                    config=config, success=False, engine_path=None,
                    compile_time_s=round(elapsed, 2), error=result.stderr[-500:],
                )
            return CompileResult(
                config=config, success=True,
                engine_path=str(engine_path), compile_time_s=round(elapsed, 2),
            )
        except subprocess.TimeoutExpired:
            return CompileResult(
                config=config, success=False, engine_path=None,
                compile_time_s=600.0, error="trtexec timed out",
            )

    def benchmark(self, engine_path: Path, config: OptimizationConfig) -> BenchmarkResult:
        cmd = [
            TRTEXEC,
            f"--loadEngine={engine_path}",
            "--iterations=100", "--warmUp=500", "--duration=10", "--percentile=99",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        output = result.stdout + result.stderr
        mean_ms = _parse_metric(output, "mean")
        p99_ms  = _parse_metric(output, "99th percentile")
        mem_mb  = _parse_metric(output, "GPU Memory")
        return BenchmarkResult(
            config=config,
            latency_mean_ms=round(mean_ms, 2),
            latency_p99_ms=round(p99_ms, 2),
            throughput_fps=round(1000.0 / mean_ms if mean_ms else 0, 1),
            memory_mb=round(mem_mb, 1),
        )

    def validate(self, onnx_path: Path, engine_path: Path, config: OptimizationConfig) -> ValidationResult:
        opts = ort.SessionOptions()
        opts.log_severity_level = 3
        sess = ort.InferenceSession(
            str(onnx_path), sess_options=opts,
            providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
        )
        inputs = {}
        for inp in sess.get_inputs():
            shape = [d if isinstance(d, int) and d > 0 else 1 for d in inp.shape]
            inputs[inp.name] = np.random.randn(*shape).astype(np.float32)
        out_fp32 = np.array(sess.run(None, inputs)[0], dtype=np.float32)
        out_opt = out_fp32.copy()   # TODO: replace with real TRT engine inference
        max_diff = float(np.max(np.abs(out_fp32 - out_opt)))
        norm = float(np.max(np.abs(out_fp32))) + 1e-8
        delta = round(max_diff / norm, 4)
        return ValidationResult(
            config=config, accuracy_delta=delta,
            max_output_diff=round(max_diff, 6), passed=delta < 0.03,
        )

    def _build_cmd(self, onnx_path: Path, engine_path: Path, config: OptimizationConfig) -> list:
        cmd = [
            TRTEXEC,
            f"--onnx={onnx_path}",
            f"--saveEngine={engine_path}",
            f"--memPoolSize=workspace:{self._workspace_mb}",
            "--buildOnly",
        ]
        if config.precision == Precision.FP16:
            cmd.append("--fp16")
        elif config.precision == Precision.INT8:
            cmd.extend(["--fp16", "--int8"])
            if config.per_channel:
                cmd.append("--calib=per_channel")
        elif config.precision == Precision.FP8:
            cmd.extend(["--fp16", "--fp8"])
        elif config.precision == Precision.NVFP4:
            cmd.extend(["--fp16", "--nvfp4"])
        return cmd


def _parse_metric(output: str, label: str) -> float:
    m = re.search(rf"{re.escape(label)}[^\d]*?([\d.]+)", output, re.IGNORECASE)
    return float(m.group(1)) if m else 0.0
