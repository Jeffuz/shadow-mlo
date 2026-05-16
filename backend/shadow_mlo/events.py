import json
import threading
from queue import Queue
from typing import Any

_lock = threading.Lock()
_subscribers: list[Queue] = []


def broadcast(event_type: str, data: Any):
    payload = json.dumps({"type": event_type, "data": data})
    with _lock:
        for q in list(_subscribers):
            q.put(payload)


def subscribe() -> Queue:
    q = Queue()
    with _lock:
        _subscribers.append(q)
    return q


def unsubscribe(q: Queue):
    with _lock:
        if q in _subscribers:
            _subscribers.remove(q)
