import logging
import hashlib
import struct
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

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

GGUF_VALUE_TYPES = {
    0: "uint8",
    1: "int8",
    2: "uint16",
    3: "int16",
    4: "uint32",
    5: "int32",
    6: "float32",
    7: "bool",
    8: "string",
    9: "array",
    10: "uint64",
    11: "int64",
    12: "float64",
}

GGML_TYPES = {
    0: "f32",
    1: "f16",
    2: "q4_0",
    3: "q4_1",
    6: "q5_0",
    7: "q5_1",
    8: "q8_0",
    9: "q8_1",
    10: "q2_k",
    11: "q3_k",
    12: "q4_k",
    13: "q5_k",
    14: "q6_k",
    15: "q8_k",
    16: "iq2_xxs",
    17: "iq2_xs",
    18: "iq3_xxs",
    19: "iq1_s",
    20: "iq4_nl",
    21: "iq3_s",
    22: "iq2_s",
    23: "iq4_xs",
    24: "i8",
    25: "i16",
    26: "i32",
    27: "i64",
    28: "f64",
    29: "iq1_m",
    30: "bf16",
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
    artifact_format: str
    opset_version: int | None = None
    inputs: list = field(default_factory=list)
    outputs: list = field(default_factory=list)
    op_types: list = field(default_factory=list)
    parameter_count: int | None = None
    has_dynamic_shapes: bool = False
    likely_type: str = "unknown"   # "cnn" | "cnn_classifier" | "transformer" | "rnn" | "mlp"
    optimization_runtime: str = "Unsupported"
    optimization_supported: bool = False
    unsupported_reason: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def artifact_type(self) -> str:
        return self.artifact_format

    @property
    def model_family(self) -> str:
        if self.artifact_format == "GGUF":
            arch = self.metadata.get("architecture")
            return f"{str(arch).upper()} LLM" if arch else "LLM"
        if self.artifact_format == "PyTorch":
            return {
                "cnn": "CNN",
                "transformer": "Transformer",
                "rnn": "RNN",
                "mlp": "MLP",
            }.get(self.likely_type, "PyTorch")
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
        if n is None:
            return "unknown"
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
            f"Format: {self.artifact_format} | "
            f"Type: {self.likely_type} | "
            f"Size: {self.file_size_mb:.1f}MB | "
            f"Params: {self.parameters_str} | "
            f"Inputs: {[i.shape for i in self.inputs]} | "
            f"Dynamic: {self.has_dynamic_shapes} | "
            f"Opset: {self.opset_version if self.opset_version is not None else 'n/a'}"
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


def _format_for_suffix(path: Path) -> str:
    return {
        ".onnx": "ONNX",
        ".pt": "PyTorch",
        ".pth": "PyTorch",
        ".gguf": "GGUF",
    }.get(path.suffix.lower(), "Unknown")


def _file_fingerprint(path: Path) -> tuple[float, str]:
    return (
        path.stat().st_size / (1024 * 1024),
        hashlib.sha256(path.read_bytes()).hexdigest(),
    )


def _inspection_only_metadata(
    path: Path,
    artifact_format: str,
    likely_type: str = "unknown",
    parameter_count: int | None = None,
    inputs: list | None = None,
    outputs: list | None = None,
    op_types: list | None = None,
    metadata: dict[str, Any] | None = None,
    route_note: str | None = None,
) -> ArtifactMetadata:
    file_size_mb, sha256 = _file_fingerprint(path)
    return ArtifactMetadata(
        path=str(path),
        artifact_name=path.name,
        file_size_mb=file_size_mb,
        sha256=sha256,
        artifact_format=artifact_format,
        inputs=inputs or [],
        outputs=outputs or [],
        op_types=op_types or [],
        parameter_count=parameter_count,
        has_dynamic_shapes=False,
        likely_type=likely_type,
        optimization_runtime="Inspection",
        optimization_supported=False,
        unsupported_reason=route_note or f"{artifact_format} inspection completed; optimization routing is not wired yet.",
        metadata=metadata or {},
    )


def _inspect_onnx(path: Path) -> ArtifactMetadata:
    file_size_mb, sha256 = _file_fingerprint(path)

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
        artifact_format="ONNX",
        opset_version=opset_version,
        inputs=inputs,
        outputs=outputs,
        op_types=op_types,
        parameter_count=parameter_count,
        has_dynamic_shapes=has_dynamic_shapes,
        likely_type=likely_type,
        optimization_runtime="TensorRT",
        optimization_supported=True,
    )


def _product(values: list[int]) -> int:
    total = 1
    for value in values:
        total *= value
    return total


def _infer_pytorch_type(op_types: list[str]) -> str:
    op_set = {op.lower() for op in op_types}
    if any("conv" in op for op in op_set):
        return "cnn"
    if any("attention" in op or "scaled_dot_product" in op for op in op_set):
        return "transformer"
    if any("lstm" in op or "gru" in op or "rnn" in op for op in op_set):
        return "rnn"
    if any("linear" in op or "matmul" in op or "addmm" in op for op in op_set):
        return "mlp"
    return "unknown"


def _inspect_pytorch_with_torch(path: Path) -> ArtifactMetadata | None:
    try:
        import torch
    except ImportError:
        return None

    file_size_mb, sha256 = _file_fingerprint(path)
    metadata: dict[str, Any] = {"loader": "torch"}
    inputs: list[TensorInfo] = []
    outputs: list[TensorInfo] = []
    op_types: list[str] = []
    parameter_count = None

    try:
        model = torch.jit.load(str(path), map_location="cpu")
        metadata["container"] = "torchscript"
        params = list(model.named_parameters())
        parameter_count = sum(p.numel() for _, p in params)
        op_types = sorted({node.kind() for node in model.inlined_graph.nodes()})
        inputs = [
            TensorInfo(name=f"input_{idx}", shape=[], dtype=str(value.type()))
            for idx, value in enumerate(list(model.inlined_graph.inputs())[1:])
        ]
        outputs = [
            TensorInfo(name=f"output_{idx}", shape=[], dtype=str(value.type()))
            for idx, value in enumerate(model.inlined_graph.outputs())
        ]
    except Exception as jit_error:
        try:
            obj = torch.load(str(path), map_location="cpu", weights_only=True)
            metadata["container"] = type(obj).__name__
            if isinstance(obj, dict):
                tensors = {k: v for k, v in obj.items() if hasattr(v, "numel")}
                parameter_count = sum(v.numel() for v in tensors.values()) or None
                metadata["tensor_keys"] = len(tensors)
                if tensors:
                    first_name, first_tensor = next(iter(tensors.items()))
                    inputs = [
                        TensorInfo(
                            name=str(first_name),
                            shape=list(first_tensor.shape),
                            dtype=str(first_tensor.dtype).replace("torch.", ""),
                        )
                    ]
            else:
                metadata["load_warning"] = "Loaded object is not a state_dict or TorchScript module."
        except Exception as load_error:
            metadata["load_error"] = str(load_error)
            metadata["jit_error"] = str(jit_error)

    likely_type = _infer_pytorch_type(op_types)
    return ArtifactMetadata(
        path=str(path),
        artifact_name=path.name,
        file_size_mb=file_size_mb,
        sha256=sha256,
        artifact_format="PyTorch",
        inputs=inputs,
        outputs=outputs,
        op_types=op_types,
        parameter_count=parameter_count,
        has_dynamic_shapes=False,
        likely_type=likely_type,
        optimization_runtime="Inspection",
        optimization_supported=False,
        unsupported_reason="PyTorch inspection completed. Add a PyTorch export or native optimizer route before building candidates.",
        metadata=metadata,
    )


def _inspect_pytorch_archive(path: Path) -> ArtifactMetadata:
    metadata: dict[str, Any] = {"loader": "archive_probe"}
    op_types: list[str] = []
    try:
        if zipfile.is_zipfile(path):
            with zipfile.ZipFile(path) as archive:
                names = archive.namelist()
                metadata["container"] = "zip"
                metadata["file_count"] = len(names)
                metadata["torchscript"] = any("/code/" in name or name.endswith("code/__torch__.py") for name in names)
                metadata["has_constants"] = any(name.endswith("constants.pkl") for name in names)
                metadata["has_data"] = any("/data/" in name for name in names)
        else:
            metadata["container"] = "pickle_or_binary"
            metadata["probe_note"] = "Raw pickle loading is skipped for safety."
    except Exception as error:
        metadata["probe_error"] = str(error)

    return _inspection_only_metadata(
        path=path,
        artifact_format="PyTorch",
        likely_type=_infer_pytorch_type(op_types),
        op_types=op_types,
        metadata=metadata,
        route_note="PyTorch archive inspection completed. Add a PyTorch export or native optimizer route before building candidates.",
    )


def _read_exact(handle, size: int) -> bytes:
    data = handle.read(size)
    if len(data) != size:
        raise ValueError("Unexpected end of GGUF file.")
    return data


def _read_u32(handle) -> int:
    return struct.unpack("<I", _read_exact(handle, 4))[0]


def _read_u64(handle) -> int:
    return struct.unpack("<Q", _read_exact(handle, 8))[0]


def _read_i64(handle) -> int:
    return struct.unpack("<q", _read_exact(handle, 8))[0]


def _read_f32(handle) -> float:
    return struct.unpack("<f", _read_exact(handle, 4))[0]


def _read_f64(handle) -> float:
    return struct.unpack("<d", _read_exact(handle, 8))[0]


def _read_gguf_string(handle) -> str:
    length = _read_u64(handle)
    return _read_exact(handle, length).decode("utf-8", errors="replace")


def _read_gguf_scalar(handle, value_type: int):
    if value_type in {0, 1, 7}:
        return struct.unpack("<B", _read_exact(handle, 1))[0]
    if value_type in {2, 3}:
        return struct.unpack("<H", _read_exact(handle, 2))[0]
    if value_type in {4, 5}:
        return _read_u32(handle)
    if value_type == 6:
        return _read_f32(handle)
    if value_type == 8:
        return _read_gguf_string(handle)
    if value_type == 10:
        return _read_u64(handle)
    if value_type == 11:
        return _read_i64(handle)
    if value_type == 12:
        return _read_f64(handle)
    raise ValueError(f"Unsupported GGUF metadata value type: {value_type}")


def _read_gguf_value(handle, value_type: int):
    if value_type == 9:
        item_type = _read_u32(handle)
        count = _read_u64(handle)
        if count > 256:
            for _ in range(count):
                _read_gguf_scalar(handle, item_type)
            return f"<array {GGUF_VALUE_TYPES.get(item_type, item_type)}[{count}]>"
        return [_read_gguf_scalar(handle, item_type) for _ in range(count)]
    return _read_gguf_scalar(handle, value_type)


def _inspect_gguf(path: Path) -> ArtifactMetadata:
    file_size_mb, sha256 = _file_fingerprint(path)
    metadata: dict[str, Any] = {}
    tensors: list[dict[str, Any]] = []

    with path.open("rb") as handle:
        magic = _read_exact(handle, 4)
        if magic != b"GGUF":
            raise ValueError("Invalid GGUF file: missing GGUF magic header.")
        version = _read_u32(handle)
        tensor_count = _read_u64(handle)
        metadata_count = _read_u64(handle)

        for _ in range(metadata_count):
            key = _read_gguf_string(handle)
            value_type = _read_u32(handle)
            metadata[key] = _read_gguf_value(handle, value_type)

        for _ in range(tensor_count):
            name = _read_gguf_string(handle)
            n_dims = _read_u32(handle)
            dims = [_read_u64(handle) for _ in range(n_dims)]
            ggml_type = _read_u32(handle)
            offset = _read_u64(handle)
            tensors.append({
                "name": name,
                "shape": dims,
                "dtype": GGML_TYPES.get(ggml_type, f"ggml_type_{ggml_type}"),
                "offset": offset,
            })

    arch = metadata.get("general.architecture")
    model_name = metadata.get("general.name")
    context_length = metadata.get(f"{arch}.context_length") if arch else None
    parameter_count = sum(_product([int(dim) for dim in tensor["shape"]]) for tensor in tensors)

    compact_metadata = {
        "version": version,
        "tensor_count": tensor_count,
        "metadata_count": metadata_count,
        "architecture": arch,
        "model_name": model_name,
        "context_length": context_length,
        "quantization_version": metadata.get("general.quantization_version"),
        "file_type": metadata.get("general.file_type"),
        "tokenizer_model": metadata.get("tokenizer.ggml.model"),
    }

    return ArtifactMetadata(
        path=str(path),
        artifact_name=path.name,
        file_size_mb=file_size_mb,
        sha256=sha256,
        artifact_format="GGUF",
        inputs=[TensorInfo(name="context", shape=[context_length] if context_length else [], dtype="tokens")],
        outputs=[TensorInfo(name="logits", shape=[], dtype="float")],
        op_types=sorted({tensor["dtype"] for tensor in tensors}),
        parameter_count=parameter_count or None,
        has_dynamic_shapes=False,
        likely_type="llm",
        optimization_runtime="Inspection",
        optimization_supported=False,
        unsupported_reason="GGUF inspection completed. Add a llama.cpp or TensorRT-LLM optimizer route before building candidates.",
        metadata=compact_metadata,
    )


def inspect(model_path: Path) -> ArtifactMetadata:
    path = Path(model_path)
    logger.info(f"Inspecting {path.name}")

    suffix = path.suffix.lower()
    if suffix == ".onnx":
        return _inspect_onnx(path)
    if suffix in {".pt", ".pth"}:
        return _inspect_pytorch_with_torch(path) or _inspect_pytorch_archive(path)
    if suffix == ".gguf":
        return _inspect_gguf(path)
    return _inspection_only_metadata(
        path=path,
        artifact_format=_format_for_suffix(path),
        route_note=f"No inspector is registered for artifact extension: {suffix or '<none>'}.",
    )
