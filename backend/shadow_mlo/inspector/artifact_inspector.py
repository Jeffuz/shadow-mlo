import hashlib
import logging
from dataclasses import dataclass, field
from pathlib import Path

import onnx
from onnx import TensorProto

logger = logging.getLogger(__name__)

DTYPE_MAP = {
    TensorProto.FLOAT:   "float32",
    TensorProto.FLOAT16: "float16",
    TensorProto.DOUBLE:  "float64",
    TensorProto.INT32:   "int32",
    TensorProto.INT64:   "int64",
    TensorProto.UINT8:   "uint8",
    TensorProto.INT8:    "int8",
    TensorProto.BOOL:    "bool",
}


@dataclass
class TensorInfo:
    name: str
    shape: list
    dtype: str


@dataclass
class ArtifactMetadata:
    path: str
    artifact_name: str
    file_size_mb: float
    sha256: str
    opset_version: int
    inputs: list
    outputs: list
    op_types: list
    parameter_count: int
    has_dynamic_shapes: bool
    likely_type: str = "unknown"   # "cnn" | "cnn_classifier" | "transformer" | "rnn" | "mlp"

    @property
    def artifact_type(self) -> str:
        return "ONNX"

    @property
    def model_family(self) -> str:
        return {
            "cnn":            "CNN",
            "cnn_classifier": "CNN",
            "transformer":    "Transformer",
            "rnn":            "RNN",
            "mlp":            "MLP",
        }.get(self.likely_type, "Unknown")

    @property
    def parameters_str(self) -> str:
        n = self.parameter_count
        if n >= 1_000_000_000:
            return f"{n / 1_000_000_000:.1f}B"
        if n >= 1_000_000:
            return f"{n / 1_000_000:.1f}M"
        if n >= 1_000:
            return f"{n / 1_000:.1f}K"
        return str(n)

    @property
    def input_shape_str(self) -> str:
        if self.inputs:
            return str(self.inputs[0].shape)
        return "unknown"

    def summary(self) -> str:
        return (
            f"Model: {self.artifact_name} | "
            f"Type: {self.likely_type} | "
            f"Size: {self.file_size_mb:.1f}MB | "
            f"Params: {self.parameter_count:,} | "
            f"Inputs: {[i.shape for i in self.inputs]} | "
            f"Dynamic: {self.has_dynamic_shapes} | "
            f"Opset: {self.opset_version}"
        )


def _shape_from_type_proto(type_proto) -> list:
    shape = []
    try:
        for dim in type_proto.tensor_type.shape.dim:
            if dim.HasField("dim_param"):
                shape.append(dim.dim_param)
            elif dim.HasField("dim_value"):
                shape.append(dim.dim_value)
            else:
                shape.append("?")
    except Exception:
        pass
    return shape


def _dtype_from_type_proto(type_proto) -> str:
    try:
        return DTYPE_MAP.get(type_proto.tensor_type.elem_type, "unknown")
    except Exception:
        return "unknown"


def _count_parameters(model: onnx.ModelProto) -> int:
    total = 0
    for init in model.graph.initializer:
        count = 1
        for dim in init.dims:
            count *= dim
        total += count
    return total


def _infer_model_type(op_types: list) -> str:
    op_set = set(op_types)
    if "Attention" in op_set or "MultiHeadAttention" in op_set or "Gelu" in op_set:
        return "transformer"
    if "LSTM" in op_set or "GRU" in op_set or "RNN" in op_set:
        return "rnn"
    if "Conv" in op_set and "Gemm" not in op_set:
        return "cnn"
    if "Conv" in op_set and "Gemm" in op_set:
        return "cnn_classifier"
    if "Gemm" in op_set or "MatMul" in op_set:
        return "mlp"
    return "unknown"


def inspect(model_path: Path) -> ArtifactMetadata:
    path = Path(model_path)
    logger.info(f"Inspecting {path.name}")

    file_size_mb = path.stat().st_size / (1024 * 1024)
    sha256 = hashlib.sha256(path.read_bytes()).hexdigest()

    model = onnx.load(str(path))
    onnx.checker.check_model(model)

    opset_version = model.opset_import[0].version if model.opset_import else 0

    initializer_names = {i.name for i in model.graph.initializer}
    inputs = [
        TensorInfo(
            name=inp.name,
            shape=_shape_from_type_proto(inp.type),
            dtype=_dtype_from_type_proto(inp.type),
        )
        for inp in model.graph.input
        if inp.name not in initializer_names
    ]
    outputs = [
        TensorInfo(
            name=out.name,
            shape=_shape_from_type_proto(out.type),
            dtype=_dtype_from_type_proto(out.type),
        )
        for out in model.graph.output
    ]

    op_types = sorted({node.op_type for node in model.graph.node})
    parameter_count = _count_parameters(model)
    has_dynamic_shapes = any(
        isinstance(dim, str) for inp in inputs for dim in inp.shape
    )
    likely_type = _infer_model_type(op_types)

    return ArtifactMetadata(
        path=str(path),
        artifact_name=path.name,
        file_size_mb=file_size_mb,
        sha256=sha256,
        opset_version=opset_version,
        inputs=inputs,
        outputs=outputs,
        op_types=op_types,
        parameter_count=parameter_count,
        has_dynamic_shapes=has_dynamic_shapes,
        likely_type=likely_type,
    )
