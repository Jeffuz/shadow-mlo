import type { ShadowJob } from "../types/shadow-mlo";

interface RecommendationCardProps {
    job: ShadowJob;
}

export function RecommendationCard({ job }: RecommendationCardProps) {
    const isComplete =
        job.status === "completed" ||
        job.stage === "completed" ||
        job.stage === "report_generated";

    const runningCandidate = job.candidates.find(
        (candidate) => candidate.status === "running"
    );

    if (!isComplete || !job.recommendation) {
        return (
            <section className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-2">
                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-3">
                            <p className="text-[9px] uppercase tracking-[0.2em] text-amber-300">
                                Recommendation Pending
                            </p>

                            <span className="rounded-full border border-amber-400/30 px-2 py-0.5 text-[10px] text-amber-300">
                                {formatStage(job.stage ?? job.status)}
                            </span>
                        </div>

                        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-white">
                                {runningCandidate?.name ?? "Waiting for benchmark"}
                            </h3>

                            <span className="text-xs text-zinc-500">—</span>

                            <p className="truncate text-xs text-zinc-400">
                                Final artifact will be selected after benchmark and quality gates.
                            </p>
                        </div>
                    </div>

                    <div className="hidden items-center gap-2 xl:flex">
                        <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-300">
                            {job.runtimePath}
                        </span>
                        <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-300">
                            {job.status}
                        </span>
                    </div>
                </div>
            </section>
        );
    }

    const recommendation = job.recommendation;

    return (
        <section className="rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] px-4 py-2">
            <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-emerald-300">
                        Recommended Artifact
                    </p>

                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                        <h3 className="truncate font-mono text-sm font-semibold text-white">
                            {recommendation.artifact}
                        </h3>

                        <span className="text-xs text-zinc-500">—</span>

                        <p className="text-xs text-zinc-400">
                            {recommendation.reason}
                        </p>
                    </div>
                </div>

                <div className="hidden grid-cols-3 gap-2 xl:grid xl:min-w-[360px]">
                    <MiniMetric label="Speedup" value={recommendation.speedup ?? "—"} />
                    <MiniMetric label="Quality" value={recommendation.quality ?? "—"} />
                    <MiniMetric label="Memory" value={recommendation.memoryReduction ?? "—"} />
                </div>
            </div>
        </section>
    );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-zinc-700 bg-zinc-950/60 px-2 py-1">
            <p className="text-[9px] text-zinc-500">{label}</p>
            <p className="truncate text-[11px] font-semibold text-zinc-100">
                {value}
            </p>
        </div>
    );
}

function formatStage(stage: string) {
    return stage
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}
