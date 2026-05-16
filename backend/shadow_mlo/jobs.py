import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


def _now_ts() -> str:
    return datetime.now().strftime("%H:%M:%S")


TIMELINE_STAGES = [
    ("detected",   "Artifact Detected"),
    ("classified", "Classification Complete"),
    ("profile",    "Device Profile Loaded"),
    ("planned",    "Plan Generated"),
    ("building",   "Candidate Builds"),
    ("benchmark",  "Benchmark"),
    ("report",     "Report Generated"),
]


@dataclass
class TimelineEvent:
    id: str
    label: str
    status: str       # "success" | "running" | "pending" | "failed"
    timestamp: Optional[str] = None

    def to_dict(self) -> dict:
        d = {"id": self.id, "label": self.label, "status": self.status}
        if self.timestamp:
            d["timestamp"] = self.timestamp
        return d


@dataclass
class Candidate:
    name: str
    runtime: str
    status: str       # "success" | "running" | "queued" | "failed"
    latency: Optional[str] = None
    throughput: Optional[str] = None
    memory: Optional[str] = None
    quality: Optional[str] = None
    artifact: Optional[str] = None
    reason: Optional[str] = None

    def to_dict(self) -> dict:
        d = {"name": self.name, "runtime": self.runtime, "status": self.status}
        for key in ("latency", "throughput", "memory", "quality", "artifact", "reason"):
            val = getattr(self, key)
            if val is not None:
                d[key] = val
        return d


@dataclass
class Classification:
    format: str
    family: str
    parameters: str
    contextLength: str
    precision: str
    runtimePath: str

    def to_dict(self) -> dict:
        return {
            "format": self.format,
            "family": self.family,
            "parameters": self.parameters,
            "contextLength": self.contextLength,
            "precision": self.precision,
            "runtimePath": self.runtimePath,
        }


@dataclass
class DeviceProfile:
    name: str
    cuda: bool
    tensorrt: bool
    tensorrtLlm: bool
    supportedPrecisions: list
    memoryBudget: str

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "cuda": self.cuda,
            "tensorrt": self.tensorrt,
            "tensorrtLlm": self.tensorrtLlm,
            "supportedPrecisions": self.supportedPrecisions,
            "memoryBudget": self.memoryBudget,
        }


@dataclass
class Recommendation:
    candidate: str
    artifact: str
    reason: str
    speedup: str
    quality: str
    memoryReduction: str

    def to_dict(self) -> dict:
        return {
            "candidate": self.candidate,
            "artifact": self.artifact,
            "reason": self.reason,
            "speedup": self.speedup,
            "quality": self.quality,
            "memoryReduction": self.memoryReduction,
        }


@dataclass
class Job:
    id: str
    artifactName: str
    artifactType: str
    modelFamily: str
    runtimePath: str
    targetDevice: str
    status: str       # "running" | "completed" | "failed"
    startedAt: str
    owner: str
    classification: Optional[Classification] = None
    deviceProfile: Optional[DeviceProfile] = None
    plan: list = field(default_factory=list)
    timeline: list = field(default_factory=list)
    candidates: list = field(default_factory=list)
    recommendation: Optional[Recommendation] = None
    stage: str = "idle"
    updatedAt: Optional[str] = None
    events: list = field(default_factory=list)

    def add_event(self, tool: str, message: str, status: str, event_type: str = "tool_call") -> None:
        self.events.append({
            "timestamp": _now_ts(),
            "type": event_type,
            "tool": tool,
            "message": message,
            "status": status,
        })

    def to_dict(self) -> dict:
        d = {
            "id": self.id,
            "artifactName": self.artifactName,
            "artifactType": self.artifactType,
            "modelFamily": self.modelFamily,
            "runtimePath": self.runtimePath,
            "targetDevice": self.targetDevice,
            "status": self.status,
            "stage": self.stage,
            "startedAt": self.startedAt,
            "updatedAt": self.updatedAt,
            "owner": self.owner,
            "plan": list(self.plan),
            "timeline": [
                e.to_dict() if isinstance(e, TimelineEvent) else e
                for e in self.timeline
            ],
            "candidates": [
                c.to_dict() if isinstance(c, Candidate) else c
                for c in self.candidates
            ],
            "recommendation": self.recommendation.to_dict() if self.recommendation else None,
            "events": list(self.events),
        }
        if self.classification:
            d["classification"] = self.classification.to_dict()
        if self.deviceProfile:
            d["deviceProfile"] = self.deviceProfile.to_dict()
        return d


def make_job_id() -> str:
    now = datetime.now()
    suffix = uuid.uuid4().hex[:3].upper()
    return f"job_{now.strftime('%Y_%m_%d')}_{suffix}"


def make_initial_timeline() -> list[TimelineEvent]:
    return [
        TimelineEvent(id=stage_id, label=label, status="pending")
        for stage_id, label in TIMELINE_STAGES
    ]
