import type { ShadowJob } from "../types/shadow-mlo";

interface SystemStatusCardsProps {
    job: ShadowJob;
}

export function SystemStatusCards({ job }: SystemStatusCardsProps) {
    const successfulCandidates = job.candidates.filter(
        (candidate) => candidate.status === "success"
    ).length;

    const runningCandidates = job.candidates.filter(
        (candidate) => candidate.status === "running"
    ).length;

    return (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
                label="Current Stage"
                value={formatStage(job.stage ?? job.status)}
                helper="Latest agent workflow state"
            />

            <MetricCard
                label="Runtime Path"
                value={job.runtimePath}
                helper="Selected optimization backend"
            />

            <MetricCard
                label="Candidates"
                value={`${successfulCandidates}/${job.candidates.length}`}
                helper={`${runningCandidates} currently running`}
            />

            <MetricCard
                label="Recommendation"
                value={job.recommendation?.candidate ?? "Pending"}
                helper={job.recommendation?.speedup ?? "Waiting for benchmark"}
            />
        </section>
    );
}

function MetricCard({
    label,
    value,
    helper,
}: {
    label: string;
    value: string;
    helper: string;
}) {
    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-xs font-medium text-zinc-500">{label}</p>
            <p className="mt-3 truncate text-2xl font-semibold text-white">{value}</p>
            <p className="mt-2 text-xs text-zinc-500">{helper}</p>
        </div>
    );
}

function formatStage(stage: string) {
    return stage
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}