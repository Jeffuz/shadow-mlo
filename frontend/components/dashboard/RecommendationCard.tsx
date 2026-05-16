import type { ShadowJob } from "../types/shadow-mlo";

interface RecommendationCardProps {
    recommendation: ShadowJob["recommendation"];
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
    if (!recommendation) {
        return (
            <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
                <h3 className="text-sm font-semibold text-white">Recommendation</h3>
                <p className="mt-3 text-sm text-zinc-500">
                    Waiting for benchmark and quality gate results.
                </p>
            </section>
        );
    }

    return (
        <section className="rounded-3xl border border-emerald-400/30 bg-emerald-400/[0.06] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
                Recommended Artifact
            </p>

            <h3 className="mt-3 font-mono text-lg font-semibold text-white">
                {recommendation.artifact}
            </h3>

            <p className="mt-3 text-sm leading-6 text-zinc-300">
                {recommendation.reason}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3">
                <MiniMetric label="Speedup" value={recommendation.speedup ?? "—"} />
                <MiniMetric label="Quality" value={recommendation.quality ?? "—"} />
                <MiniMetric
                    label="Memory"
                    value={recommendation.memoryReduction ?? "—"}
                />
            </div>
        </section>
    );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-emerald-400/20 bg-zinc-950/60 p-3">
            <p className="text-[11px] text-zinc-500">{label}</p>
            <p className="mt-1 text-sm font-semibold text-emerald-300">{value}</p>
        </div>
    );
}