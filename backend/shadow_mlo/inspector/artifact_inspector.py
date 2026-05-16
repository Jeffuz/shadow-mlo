import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class ArtifactMetadata:
    path: str
    artifact_name: str
    artifact_type: str    # "Hugging Face Transformer" | "GGUF" | "PyTorch Checkpoint"
    model_family: str     # "LLM" | "VLM" | "Embedding" | "Diffusion"
    architecture: str     # "LlamaForCausalLM", "MistralForCausalLM", etc.
    parameters: str       # "1.3B", "7B", "70B"
    context_length: str   # "2048", "4096", "131072"
    default_precision: str  # "BF16", "FP16", "FP32"

    def summary(self) -> str:
        return (
            f"Artifact: {self.artifact_name} | "
            f"Type: {self.artifact_type} | "
            f"Family: {self.model_family} | "
            f"Arch: {self.architecture} | "
            f"Params: {self.parameters} | "
            f"Context: {self.context_length} | "
            f"Precision: {self.default_precision}"
        )


def _format_params(count: int) -> str:
    if count >= 1_000_000_000:
        return f"{count / 1_000_000_000:.1f}B"
    if count >= 1_000_000:
        return f"{count / 1_000_000:.0f}M"
    return str(count)


def _infer_family(arch: str, config: dict) -> str:
    arch_lower = arch.lower()
    if any(k in arch_lower for k in ("causal", "gpt", "llama", "mistral", "falcon", "phi", "gemma", "qwen", "deepseek", "nemotron")):
        return "LLM"
    if any(k in arch_lower for k in ("vlm", "vision", "clip", "blip", "llava", "idefics", "paligemma")):
        return "VLM"
    if any(k in arch_lower for k in ("embed", "sentence", "bert", "roberta", "e5", "bge")):
        return "Embedding"
    if "diffus" in arch_lower or "unet" in arch_lower or "dit" in arch_lower:
        return "Diffusion"
    # Fall back to model_type
    model_type = config.get("model_type", "").lower()
    if any(k in model_type for k in ("llama", "gpt", "mistral", "falcon", "phi", "gemma")):
        return "LLM"
    return "LLM"


def _estimate_params_from_config(config: dict) -> int:
    """Rough parameter estimate from model architecture config."""
    hidden = config.get("hidden_size", 0)
    layers = config.get("num_hidden_layers", 0)
    vocab = config.get("vocab_size", 0)
    intermediate = config.get("intermediate_size", hidden * 4 if hidden else 0)

    if not hidden or not layers:
        return 0

    embed = vocab * hidden if vocab else 0
    attn_per_layer = 4 * hidden * hidden
    ffn_per_layer = 2 * hidden * intermediate
    return embed + layers * (attn_per_layer + ffn_per_layer)


def _params_from_safetensors_index(index_path: Path) -> Optional[int]:
    """Read total parameter count from safetensors index metadata."""
    try:
        index = json.loads(index_path.read_text())
        total_bytes = index.get("metadata", {}).get("total_size", 0)
        if total_bytes:
            # total_size is bytes; bfloat16 = 2 bytes per param
            return total_bytes // 2
    except Exception:
        pass
    return None


def _params_from_config_metadata(path: Path) -> Optional[int]:
    """Some models store param count directly in config extras."""
    for fname in ("config.json", "generation_config.json"):
        cfg_path = path / fname
        if cfg_path.exists():
            try:
                data = json.loads(cfg_path.read_text())
                for key in ("num_parameters", "total_parameters", "model_parameters"):
                    if key in data:
                        return int(data[key])
            except Exception:
                pass
    return None


def inspect(artifact_path: Path) -> ArtifactMetadata:
    path = Path(artifact_path)
    artifact_name = path.name

    # ── GGUF single-file format ────────────────────────────────────────────
    if path.is_file() and path.suffix == ".gguf":
        return ArtifactMetadata(
            path=str(path),
            artifact_name=artifact_name,
            artifact_type="GGUF",
            model_family="LLM",
            architecture="unknown",
            parameters="unknown",
            context_length="unknown",
            default_precision="Q4_K_M",
        )

    # ── Hugging Face directory ─────────────────────────────────────────────
    config_path = path / "config.json"
    if not config_path.exists():
        raise ValueError(f"No config.json found in {path}. Not a supported artifact format.")

    config = json.loads(config_path.read_text())

    # Architecture
    archs = config.get("architectures", [])
    arch = archs[0] if archs else config.get("model_type", "unknown")

    # Model family
    family = _infer_family(arch, config)

    # Context length
    ctx = (
        config.get("max_position_embeddings")
        or config.get("max_seq_len")
        or config.get("n_positions")
        or config.get("seq_length")
        or 2048
    )
    context_length = str(ctx)

    # Default precision
    torch_dtype = config.get("torch_dtype", "bfloat16")
    precision_map = {"bfloat16": "BF16", "float16": "FP16", "float32": "FP32", "auto": "BF16"}
    default_precision = precision_map.get(torch_dtype, "BF16")

    # Parameter count — try several sources in order
    param_count = (
        _params_from_config_metadata(path)
        or _params_from_safetensors_index(path / "model.safetensors.index.json")
        or _estimate_params_from_config(config)
    )
    parameters = _format_params(param_count) if param_count else "unknown"

    logger.info(
        f"Inspected {artifact_name}: {family} | {arch} | {parameters} | ctx={context_length} | {default_precision}"
    )

    return ArtifactMetadata(
        path=str(path),
        artifact_name=artifact_name,
        artifact_type="Hugging Face Transformer",
        model_family=family,
        architecture=arch,
        parameters=parameters,
        context_length=context_length,
        default_precision=default_precision,
    )
