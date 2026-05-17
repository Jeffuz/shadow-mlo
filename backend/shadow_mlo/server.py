import asyncio
import re
import threading
from pathlib import Path
from queue import Empty, Queue
from typing import Callable, Optional

import uvicorn
from fastapi import FastAPI, File, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from shadow_mlo import events

app = FastAPI(title="Shadow-MLO API")

UPLOAD_EXTENSIONS = {".onnx", ".pt", ".gguf"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_registry = None
_hardware_profile: dict = {}
_trigger_callback: Optional[Callable[[Path], None]] = None
_upload_dir = Path("models") / "uploads"


def set_registry(registry):
    global _registry
    _registry = registry


def set_hardware(profile):
    global _hardware_profile
    _hardware_profile = {
        "name": profile.name,
        "displayName": profile.display_name,
        "cuda": profile.cuda,
        "tensorrt": profile.tensorrt,
        "tensorrtLlm": profile.tensorrt_llm,
        "computeCapability": profile.compute_capability,
        "supportedPrecisions": profile.supported_precisions,
        "memoryBudget": profile.memory_budget,
        "optimizerTier": profile.optimizer_tier,
    }


def set_trigger(callback: Callable[[Path], None]):
    global _trigger_callback
    _trigger_callback = callback


# ── SSE stream ────────────────────────────────────────────────────────────────

@app.get("/stream")
async def stream(request: Request):
    q = events.subscribe()

    async def generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                loop = asyncio.get_event_loop()
                try:
                    data = await loop.run_in_executor(None, lambda: q.get(timeout=1))
                    yield f"data: {data}\n\n"
                except Empty:
                    yield ": heartbeat\n\n"
        finally:
            events.unsubscribe(q)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Jobs ──────────────────────────────────────────────────────────────────────

@app.get("/api/jobs")
async def list_jobs():
    if _registry is None:
        return JSONResponse([])
    return JSONResponse(_registry.get_all_jobs())


@app.get("/api/jobs/latest")
async def latest_job():
    if _registry is None:
        return JSONResponse({"error": "Registry not initialized"}, status_code=503)
    jobs = _registry.get_all_jobs(limit=1)
    if not jobs:
        return JSONResponse({"error": "No jobs found"}, status_code=404)
    return JSONResponse(jobs[0])


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    if _registry is None:
        return JSONResponse({"error": "Registry not initialized"}, status_code=503)
    job = _registry.get_job(job_id)
    if job is None:
        return JSONResponse({"error": f"Job {job_id} not found"}, status_code=404)
    return JSONResponse(job)


class RunRequest(BaseModel):
    artifact_path: str
    owner: str = "se_engineer"


@app.post("/api/run")
async def trigger_run(body: RunRequest):
    """Manually trigger optimization for an artifact path."""
    if _trigger_callback is None:
        return JSONResponse({"error": "No trigger callback registered"}, status_code=503)

    path = Path(body.artifact_path)
    if not path.exists():
        return JSONResponse({"error": f"Path not found: {body.artifact_path}"}, status_code=404)

    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, lambda: _trigger_callback(path))
    return JSONResponse({"ok": True, "artifact": body.artifact_path})


@app.post("/api/upload")
async def upload_artifact(file: UploadFile = File(...)):
    """Upload an artifact and trigger optimization for it."""
    if _trigger_callback is None:
        return JSONResponse({"error": "No trigger callback registered"}, status_code=503)

    filename = _safe_filename(file.filename or "")
    if not filename:
        return JSONResponse({"error": "Upload must include a filename"}, status_code=400)

    suffix = Path(filename).suffix.lower()
    if suffix not in UPLOAD_EXTENSIONS:
        allowed = ", ".join(sorted(UPLOAD_EXTENSIONS))
        return JSONResponse(
            {"error": f"Unsupported artifact type. Expected one of: {allowed}"},
            status_code=400,
        )

    _upload_dir.mkdir(parents=True, exist_ok=True)
    destination = _unique_upload_path(_upload_dir / filename)

    with destination.open("wb") as output:
        while chunk := await file.read(1024 * 1024):
            output.write(chunk)

    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, lambda: _trigger_callback(destination))

    return JSONResponse({"ok": True, "artifact": str(destination), "filename": destination.name})


# ── Hardware ──────────────────────────────────────────────────────────────────

@app.get("/api/hardware")
async def hardware():
    return JSONResponse(_hardware_profile)


# ── Utility ───────────────────────────────────────────────────────────────────

@app.post("/api/clear")
async def clear():
    if _registry is not None:
        _registry.clear_all()
    return JSONResponse({"ok": True})


@app.get("/api/health")
async def health():
    return JSONResponse({"status": "ok"})


# ── Server start ──────────────────────────────────────────────────────────────

def start(host: str = "0.0.0.0", port: int = 7860):
    thread = threading.Thread(
        target=uvicorn.run,
        kwargs={"app": app, "host": host, "port": port, "log_level": "warning"},
        daemon=True,
    )
    thread.start()
    return thread


def _safe_filename(filename: str) -> str:
    name = Path(filename).name.strip()
    return re.sub(r"[^A-Za-z0-9._() -]+", "_", name)


def _unique_upload_path(path: Path) -> Path:
    if not path.exists():
        return path

    stem = path.stem
    suffix = path.suffix
    parent = path.parent
    counter = 1

    while True:
        candidate = parent / f"{stem}_{counter}{suffix}"
        if not candidate.exists():
            return candidate
        counter += 1
