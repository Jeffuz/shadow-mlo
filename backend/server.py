# Entry point preserved for backward compatibility — use main.py to start the full pipeline.
# This file runs the API server only (no watcher, no agent).
import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

from shadow_mlo.registry.registry import JobRegistry
from shadow_mlo.hardware import detect
from shadow_mlo.server import set_registry, set_hardware, app  # noqa: F401
import uvicorn

DB_PATH     = Path(os.getenv("SHADOW_DB_PATH", "shadow_mlo.db"))
SERVER_PORT = int(os.getenv("SHADOW_PORT", "7860"))

if __name__ == "__main__":
    profile  = detect()
    registry = JobRegistry(DB_PATH)
    set_registry(registry)
    set_hardware(profile)
    uvicorn.run(app, host="0.0.0.0", port=SERVER_PORT)
