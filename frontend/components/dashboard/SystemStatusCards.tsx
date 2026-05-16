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
        <section className="grid grid-cols-1 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 md:grid-cols-4">
            <CompactMetric
                label="Stage"
                value={formatStage(job.stage ?? job.status)}
            />

            <CompactMetric label="Runtime" value={job.runtimePath} />

            <CompactMetric
                label="Candidates"
                value={`${successfulCandidates}/${job.candidates.length}`}
                helper={`${runningCandidates} running`}
            />

            <CompactMetric
                label="Recommendation"
                value={
                    job.status === "completed" && job.recommendation
                        ? job.recommendation.candidate
                        : "Pending"
                }
                helper={
                    job.status === "completed" && job.recommendation
                        ? job.recommendation.speedup
                        : "after benchmark"
                }
            />
        </section>
    );
}

function CompactMetric({
    label,
    value,
    helper,
}: {
    label: string;
    value: string;
    helper?: string;
}) {
    return (
        <div className="border-b border-zinc-800 px-4 py-2.5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
            <p className="text-[9px] uppercase tracking-wide text-zinc-500">
                {label}
            </p>
            <div className="mt-0.5 flex items-baseline gap-2">
                <p className="truncate text-sm font-semibold text-white">{value}</p>
                {helper ? <p className="text-[11px] text-zinc-500">{helper}</p> : null}
            </div>
        </div>
    );
}

function formatStage(stage: string) {
    return stage
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}
