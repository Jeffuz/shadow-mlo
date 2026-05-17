import logging
from dataclasses import dataclass
from pathlib import Path

from shadow_mlo.inspector.artifact_inspector import ArtifactMetadata

logger = logging.getLogger(__name__)


@dataclass
class ExportResult:
    success: bool
    onnx_path: Path | None = None
    error: str | None = None


def export_torchscript_to_onnx(
    model_path: Path,
    metadata: ArtifactMetadata,
    output_dir: Path,
) -> ExportResult:
    try:
        import torch
    except ImportError:
        return ExportResult(success=False, error="PyTorch is not installed in the backend environment.")

    try:
        model_path = Path(model_path)
        output_dir.mkdir(parents=True, exist_ok=True)
        onnx_path = output_dir / f"{model_path.stem}.exported.onnx"

        model = torch.jit.load(str(model_path), map_location="cpu").eval()
        example_inputs = _example_inputs(model, metadata, torch)
        export_args = tuple(example_inputs) if len(example_inputs) > 1 else example_inputs[0]

        torch.onnx.export(
            model,
            export_args,
            str(onnx_path),
            export_params=True,
            opset_version=17,
            do_constant_folding=True,
            input_names=[f"input_{idx}" for idx in range(len(example_inputs))],
            output_names=["output_0"],
            dynamo=False,
            dynamic_axes={
                f"input_{idx}": {0: "batch"} for idx in range(len(example_inputs))
            } | {"output_0": {0: "batch"}},
        )
        logger.info("Exported %s to %s", model_path.name, onnx_path)
        return ExportResult(success=True, onnx_path=onnx_path)
    except Exception as error:
        logger.warning("PyTorch to ONNX export failed for %s: %s", model_path, error)
        return ExportResult(success=False, error=str(error))


def _example_inputs(model, metadata: ArtifactMetadata, torch) -> list:
    shapes = [_normalize_shape(tensor.shape) for tensor in metadata.inputs if tensor.shape]
    shapes = [shape for shape in shapes if shape]
    if not shapes:
        shapes = _infer_shapes_from_parameters(model)
    if not shapes:
        shapes = [[1, 1]]
    return [torch.randn(*shape, dtype=torch.float32) for shape in shapes]


def _normalize_shape(shape: list) -> list[int]:
    normalized = []
    for idx, dim in enumerate(shape):
        if isinstance(dim, int) and dim > 0:
            normalized.append(dim)
        else:
            normalized.append(1 if idx == 0 else 1)
    return normalized


def _infer_shapes_from_parameters(model) -> list[list[int]]:
    for _, param in model.named_parameters():
        shape = list(param.shape)
        if len(shape) == 2:
            return [[1, int(shape[1])]]
    return []
