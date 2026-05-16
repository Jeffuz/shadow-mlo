import logging
import subprocess
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class HardwareProfile:
    name: str                    # "DGX Spark", "RTX 4090", "CPU"
    display_name: str            # shown in UI and prompts
    cuda: bool
    tensorrt: bool
    tensorrt_llm: bool
    compute_capability: str      # "10.0", "8.9", etc.
    vram_mb: int
    memory_budget: str           # "128 GB unified", "24 GB VRAM", "CPU-only"
    supported_precisions: list[str]
    optimizer_tier: str          # "tensorrt_llm" | "mock"

    def supports(self, precision: str) -> bool:
        return precision in self.supported_precisions


def _nvidia_smi() -> dict | None:
    try:
        out = subprocess.check_output(
            ["nvidia-smi",
             "--query-gpu=name,compute_cap,memory.total",
             "--format=csv,noheader,nounits"],
            stderr=subprocess.DEVNULL,
            text=True,
            timeout=5,
        ).strip().splitlines()[0]
        parts = [p.strip() for p in out.split(",")]
        if len(parts) < 3:
            return None
        # GB10 (DGX Spark) uses unified memory — memory.total reports "[N/A]"
        try:
            vram_mb = int(float(parts[2]))
        except ValueError:
            vram_mb = 128 * 1024   # 128 GB unified on GB10
        return {
            "name": parts[0],
            "compute_cap": parts[1],
            "vram_mb": vram_mb,
        }
    except Exception:
        return None


def _has_tensorrt() -> bool:
    try:
        import tensorrt  # noqa: F401
        return True
    except ImportError:
        return False


def _has_tensorrt() -> bool:
    try:
        import tensorrt  # noqa: F401
        return True
    except ImportError:
        return False


def _has_cuda_ort() -> bool:
    try:
        import onnxruntime as ort
        return "CUDAExecutionProvider" in ort.get_available_providers()
    except ImportError:
        return False


def _precisions_for_sm(compute_cap: str) -> list[str]:
    """Return TensorRT-supported precisions for this GPU generation."""
    try:
        major, minor = compute_cap.split(".")
        sm = int(major) * 10 + int(minor)
    except Exception:
        return ["fp32", "fp16"]

    precisions = ["fp32", "fp16", "int8"]
    if sm >= 89:    # Ada Lovelace and above
        precisions.append("fp8")
    if sm >= 100:   # Blackwell (GB10 DGX Spark)
        precisions.append("nvfp4")
    return precisions


def _device_name(gpu_name: str, compute_cap: str) -> str:
    name_lower = gpu_name.lower()
    if "dgx" in name_lower or "gb10" in name_lower:
        return "DGX Spark"
    sm_map = {
        "10.0": "Blackwell",
        "9.0": "Hopper",
        "8.9": "Ada Lovelace",
        "8.6": "Ampere",
        "8.0": "Ampere",
    }
    arch = sm_map.get(compute_cap, f"SM {compute_cap}")
    return f"{gpu_name} ({arch})"


def _memory_budget(name: str, vram_mb: int) -> str:
    if "dgx" in name.lower() or vram_mb > 100_000:
        return "128 GB unified"
    return f"{vram_mb // 1024} GB VRAM"


def detect() -> HardwareProfile:
    gpu = _nvidia_smi()

    if gpu is None:
        logger.warning("No NVIDIA GPU detected — running in mock mode.")
        return HardwareProfile(
            name="CPU",
            display_name="CPU (no GPU — mock mode)",
            cuda=False,
            tensorrt=False,
            tensorrt_llm=False,
            compute_capability="0.0",
            vram_mb=0,
            memory_budget="CPU-only",
            supported_precisions=["BF16", "FP16", "INT8"],
            optimizer_tier="mock",
        )

    name = gpu["name"]
    compute_cap = gpu["compute_cap"]
    vram_mb = gpu["vram_mb"]
    precisions = _precisions_for_sm(compute_cap)
    has_trt = _has_tensorrt()
    has_trt_llm = _has_tensorrt_llm()
    device_name = _device_name(name, compute_cap)
    budget = _memory_budget(name, vram_mb)

    has_cuda = _has_cuda_ort()

    if has_trt:
        tier = "tensorrt"
        logger.info(f"Hardware: {device_name} — TensorRT mode")
    elif has_cuda:
        tier = "ort"
        logger.info(f"Hardware: {device_name} — ONNX Runtime GPU mode")
    else:
        tier = "mock"
        logger.warning(f"Hardware: {device_name} — no TensorRT/CUDA, running mock builds")

    return HardwareProfile(
        name=device_name,
        display_name=f"{device_name} ({vram_mb // 1024}GB)",
        cuda=has_cuda,
        tensorrt=has_trt,
        tensorrt_llm=False,
        compute_capability=compute_cap,
        vram_mb=vram_mb,
        memory_budget=budget,
        supported_precisions=precisions,
        optimizer_tier=tier,
    )
