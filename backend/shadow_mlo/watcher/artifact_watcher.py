import logging
from pathlib import Path
from typing import Callable

from watchdog.events import FileSystemEventHandler, FileCreatedEvent, FileMovedEvent
from watchdog.observers.polling import PollingObserver as Observer

logger = logging.getLogger(__name__)

WATCHED_EXTENSIONS = {".onnx", ".pt", ".gguf"}


class ModelEventHandler(FileSystemEventHandler):
    def __init__(self, on_model_detected: Callable[[Path], None]):
        super().__init__()
        self._callback = on_model_detected

    def on_created(self, event: FileCreatedEvent):
        if not event.is_directory:
            path = Path(event.src_path)
            if path.suffix in WATCHED_EXTENSIONS:
                logger.info(f"New model detected: {path.name}")
                self._callback(path)

    def on_moved(self, event: FileMovedEvent):
        if not event.is_directory:
            path = Path(event.dest_path)
            if path.suffix in WATCHED_EXTENSIONS:
                logger.info(f"Model moved in: {path.name}")
                self._callback(path)


class ArtifactWatcher:
    def __init__(self, watch_dir: str | Path, on_artifact_detected: Callable[[Path], None]):
        self._watch_dir = Path(watch_dir)
        self._handler = ModelEventHandler(on_artifact_detected)
        self._observer = Observer()

    def start(self):
        self._watch_dir.mkdir(parents=True, exist_ok=True)
        self._observer.schedule(self._handler, str(self._watch_dir), recursive=False)
        self._observer.start()
        logger.info(f"Watching {self._watch_dir} for {', '.join(WATCHED_EXTENSIONS)} files...")

    def stop(self):
        self._observer.stop()
        self._observer.join()
