from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Optional


class Precision(str, Enum):
    FP32  = "fp32"
    FP16  = "fp16"
    INT8  = "int8"
    FP8   = "fp8"
    NVFP4 = "nvfp4"


@dataclass
class OptimizationConfig:
    precision: Precision
    workspace_mb: int = 4096
    calibration_algo: str = "entropy"   # entropy | percentile | max
    per_channel: bool = False
    extra_flags: dict = None

    def label(self) -> str:
        label = self.precision.value
        if self.precision == Precision.INT8:
            label += f"_{self.calibration_algo}"
            if self.per_channel:
                label += "_perchannel"
        return label

    def display_name(self) -> str:
        names = {
            Precision.FP32:  "FP32 Baseline",
            Precision.FP16:  "FP16",
            Precision.INT8:  f"INT8 ({self.calibration_algo}{'  per-channel' if self.per_channel else ''})",
            Precision.FP8:   "FP8",
            Precision.NVFP4: "NVFP4",
        }
        return names.get(self.precision, self.label())


@dataclass
class CompileResult:
    config: OptimizationConfig
    success: bool
    engine_path: Optional[str]
    compile_time_s: float
    error: Optional[str] = None


@dataclass
class BenchmarkResult:
    config: OptimizationConfig
    latency_mean_ms: float
    latency_p99_ms: float
    throughput_fps: float
    memory_mb: float


@dataclass
class ValidationResult:
    config: OptimizationConfig
    accuracy_delta: float
    max_output_diff: float
    passed: bool


@dataclass
class CandidateResult:
    compile: CompileResult
    benchmark: Optional[BenchmarkResult]
    validation: Optional[ValidationResult]

    def failed(self) -> bool:
        return not self.compile.success

    def similarity_pct(self) -> Optional[float]:
        if self.validation:
            return round((1 - self.validation.accuracy_delta) * 100, 1)
        return None


class OptimizerBackend(ABC):
    @abstractmethod
    def compile(self, onnx_path: Path, config: OptimizationConfig) -> CompileResult:
        ...

    @abstractmethod
    def benchmark(self, engine_path: Path, config: OptimizationConfig) -> BenchmarkResult:
        ...

    @abstractmethod
    def validate(self, onnx_path: Path, engine_path: Path, config: OptimizationConfig) -> ValidationResult:
        ...
