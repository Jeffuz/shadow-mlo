export type RuntimePath =
    | "TensorRT"
    | "TensorRT-LLM"
    | "Benchmark Only"
    | "Unsupported"
    | "Unknown";

export type ModelFamily =
    | "Vision CNN"
    | "Detection"
    | "LLM"
    | "Encoder"
    | "Existing Artifact"
    | "Unknown";

export type JobStatus =
    | "idle"
    | "queued"
    | "running"
    | "completed"
    | "failed";

export type StepStatus =
    | "pending"
    | "queued"
    | "running"
    | "success"
    | "failed"
    | "skipped";

export type JobStage =
    | "idle"
    | "artifact_detected"
    | "classified"
    | "device_profile_loaded"
    | "plan_generated"
    | "building_candidates"
    | "benchmarking"
    | "quality_check"
    | "report_generated"
    | "completed"
    | "failed";

export interface TimelineStep {
    id: string;
    label: string;
    status: StepStatus;
    timestamp?: string;
}

export interface CandidateResult {
    name: string;
    runtime: RuntimePath;
    status: StepStatus;
    decision?: string;
    latency?: string;
    throughput?: string;
    memory?: string;
    quality?: string;
    artifact?: string;
    reason?: string;
}

export interface ShadowJob {
    id: string;
    artifactName: string;
    artifactType: string;
    modelFamily: ModelFamily;
    runtimePath: RuntimePath;
    targetDevice: string;
    status: JobStatus;
    stage?: JobStage;
    startedAt: string;
    updatedAt?: string;
    owner?: string;

    classification?: {
        format: string;
        family: ModelFamily;
        parameters?: string;
        inputShape?: string;
        contextLength?: string;
        precision?: string;
        runtimePath: RuntimePath;
    } | null;

    deviceProfile?: {
        name: string;
        cuda: boolean;
        tensorrt: boolean;
        tensorrtLlm: boolean;
        supportedPrecisions: string[];
        memoryBudget: string;
    } | null;

    plan: string[];
    timeline: TimelineStep[];
    candidates: CandidateResult[];

    recommendation?: {
        candidate: string;
        artifact: string;
        reason: string;
        speedup?: string;
        quality?: string;
        memoryReduction?: string;
    } | null;

    events?: {
        timestamp: string;
        type: string;
        tool?: string;
        message: string;
        status: StepStatus;
    }[];
}
