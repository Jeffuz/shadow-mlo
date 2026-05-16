import logging
import os
import time
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from shadow_mlo import events
from shadow_mlo.agent.agent import ShadowAgent
from shadow_mlo.hardware import detect, HardwareProfile
from shadow_mlo.optimizer.mock import MockOptimizer
from shadow_mlo.registry.registry import JobRegistry
from shadow_mlo.server import set_registry, set_hardware, set_trigger, start as start_server
from shadow_mlo.watcher.artifact_watcher import ArtifactWatcher

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("shadow_mlo")

WATCH_DIR   = Path(os.getenv("SHADOW_WATCH_DIR",  "models"))
DB_PATH     = Path(os.getenv("SHADOW_DB_PATH",    "shadow_mlo.db"))
SERVER_PORT = int(os.getenv("SHADOW_PORT",         "7860"))
OWNER       = os.getenv("SHADOW_OWNER",            "se_engineer")


def build_optimizer(profile: HardwareProfile):
    if profile.optimizer_tier == "tensorrt":
        from shadow_mlo.optimizer.tensorrt_optimizer import TensorRTOptimizer
        return TensorRTOptimizer()
    if profile.optimizer_tier == "ort":
        try:
            from shadow_mlo.optimizer.ort_optimizer import ORTOptimizer
            return ORTOptimizer(vram_mb=profile.vram_mb)
        except ImportError:
            logger.warning("ORT optimizer route selected, but ORTOptimizer is not implemented; falling back to MockOptimizer.")
    return MockOptimizer()


if __name__ == "__main__":
    logger.info("Shadow-MLO starting...")

    profile   = detect()
    optimizer = build_optimizer(profile)

    logger.info(f"Hardware  : {profile.display_name}")
    logger.info(f"Optimizer : {type(optimizer).__name__}")
    logger.info(f"Precisions: {', '.join(profile.supported_precisions)}")
    logger.info(f"Watching  : {WATCH_DIR.resolve()}")

    registry = JobRegistry(DB_PATH)
    agent = ShadowAgent(
        optimizer=optimizer,
        registry=registry,
        hardware_profile=profile,
        owner=OWNER,
    )

    def on_model_detected(model_path: Path):
        logger.info(f"Triggering optimization for: {model_path.name}")
        try:
            agent.run(model_path)
        except Exception as e:
            logger.error(f"Pipeline failed for {model_path.name}: {e}", exc_info=True)
            events.broadcast("pipeline_error", {"artifact": model_path.name, "error": str(e)})

    set_registry(registry)
    set_hardware(profile)
    set_trigger(on_model_detected)
    start_server(port=SERVER_PORT)
    logger.info(f"API       : http://localhost:{SERVER_PORT}")
    logger.info(f"Jobs      : http://localhost:{SERVER_PORT}/api/jobs")
    logger.info(f"Stream    : http://localhost:{SERVER_PORT}/stream")

    watcher = ArtifactWatcher(watch_dir=WATCH_DIR, on_artifact_detected=on_model_detected)
    watcher.start()
    events.broadcast("watching", {"hardware": profile.display_name})
    logger.info("Drop an .onnx, .pt, or .gguf file into models/ to trigger optimization.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        watcher.stop()
