import logging
from pathlib import Path
from typing import Callable

from watchdog.events import FileSystemEventHandler, FileCreatedEvent, FileMovedEvent, DirCreatedEvent, DirModifiedEvent
from watchdog.observers.polling import PollingObserver as Observer

logger = logging.getLogger(__name__)

# Single-file artifact formats
WATCHED_EXTENSIONS = {".gguf"}


class ArtifactEventHandler(FileSystemEventHandler):
    """
    Detects two kinds of new artifacts:
    - A new directory that contains config.json (Hugging Face format)
    - A new .gguf file (GGUF format)
    """

    def __init__(self, on_artifact_detected: Callable[[Path], None]):
        super().__init__()
        self._callback = on_artifact_detected
        self._seen: set[str] = set()

    def on_created(self, event):
        path = Path(event.src_path)
        if event.is_directory:
            self._check_hf_dir(path)
        elif path.suffix in WATCHED_EXTENSIONS:
            self._trigger(path)

    def on_moved(self, event: FileMovedEvent):
        path = Path(event.dest_path)
        if event.is_directory:
            self._check_hf_dir(path)
        elif path.suffix in WATCHED_EXTENSIONS:
            self._trigger(path)

    def on_modified(self, event: DirModifiedEvent):
        # A config.json being written into an existing dir triggers this
        if event.is_directory:
            self._check_hf_dir(Path(event.src_path))

    def _check_hf_dir(self, path: Path):
        config = path / "config.json"
        if config.exists() and str(path) not in self._seen:
            self._trigger(path)

    def _trigger(self, path: Path):
        key = str(path)
        if key in self._seen:
            return
        self._seen.add(key)
        logger.info(f"Artifact detected: {path.name}")
        self._callback(path)


class ArtifactWatcher:
    def __init__(self, watch_dir: str | Path, on_artifact_detected: Callable[[Path], None]):
        self._watch_dir = Path(watch_dir)
        self._handler = ArtifactEventHandler(on_artifact_detected)
        self._observer = Observer()

    def start(self):
        self._watch_dir.mkdir(parents=True, exist_ok=True)
        self._observer.schedule(self._handler, str(self._watch_dir), recursive=True)
        self._observer.start()
        logger.info(f"Watching {self._watch_dir} for HF model directories and .gguf files...")

    def stop(self):
        self._observer.stop()
        self._observer.join()
