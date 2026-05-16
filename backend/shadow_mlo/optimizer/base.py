from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Optional


class Precision(str, Enum):
    BF16  = "BF16"
    FP16  = "FP16"
    INT8  = "INT8"    # weight-only quantization
    FP8   = "FP8"
    NVFP4 = "NVFP4"


@dataclass
class BuildConfig:
    name: str              # "BF16 Baseline", "INT8 Weight-Only", "NVFP4"
    precision: Precision
    runtime: str = "TensorRT-LLM"
    condition: Optional[str] = None   # e.g., "Only run if support is detected"

    def artifact_suffix(self) -> str:
        return self.precision.value.lower()

    def candidate_artifact(self, base_name: str) -> str:
        return f"{base_name}_{self.artifact_suffix()}/"


@dataclass
class BuildResult:
    config: BuildConfig
    status: str              # "success" | "failed"
    latency_ms_per_token: Optional[float] = None
    throughput_toks_per_sec: Optional[float] = None
    memory_gb: Optional[float] = None
    quality_pct: Optional[float] = None   # % of BF16 baseline quality (100 = identical)
    artifact_path: Optional[str] = None
    error: Optional[str] = None

    def failed(self) -> bool:
        return self.status == "failed"


class LLMOptimizerBackend(ABC):
    @abstractmethod
    def build(self, artifact_path: Path, config: BuildConfig) -> BuildResult:
        """Build a TensorRT-LLM engine for the given artifact and precision config."""
        ...
