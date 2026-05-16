import type { ShadowJob } from "../types/shadow-mlo";

export function AgentReasoningCard({ job }: { job: ShadowJob }) {
    const reasoning = getAgentReasoning(job);

    return (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-white">Agent Reasoning</h2>
                    <p className="mt-0.5 text-xs text-zinc-500">
                        Why Shadow-MLO selected this optimization path.
                    </p>
                </div>

                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300">
                    Nemotron Decision
                </span>
            </div>

            <div className="thin-scrollbar max-h-32 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 pr-2">
                <p className="text-sm leading-6 text-zinc-300">
                    {reasoning}
                </p>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
                <ReasonMetric
                    label="Runtime"
                    value={job.runtimePath}
                />
                <ReasonMetric
                    label="Target"
                    value={job.targetDevice}
                />
                <ReasonMetric
                    label="Winner"
                    value={job.recommendation?.candidate ?? "Pending"}
                />
            </div>
        </section>
    );
}

function ReasonMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                {label}
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-zinc-200">
                {value}
            </p>
        </div>
    );
}

function getAgentReasoning(job: ShadowJob) {
    if (job.recommendation?.reason) {
        return job.recommendation.reason;
    }

    const reasoningPlanItem = job.plan.find((item) =>
        item.toLowerCase().startsWith("reasoning:")
    );

    if (reasoningPlanItem) {
        return reasoningPlanItem.replace(/^reasoning:\s*/i, "").trim();
    }

    return "Shadow-MLO selected the runtime path and candidate builds based on artifact format, model family, target device capabilities, available precision modes, and expected latency-to-quality trade-offs.";
}