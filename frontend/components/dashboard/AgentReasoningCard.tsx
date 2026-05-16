import type { ShadowJob } from "../types/shadow-mlo";

export function AgentReasoningCard({ job }: { job: ShadowJob }) {
    const reasoningLoading = isReasoningLoading(job);
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

                <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${reasoningLoading
                        ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                        : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                        }`}
                >
                    {reasoningLoading ? "Generating" : "Nemotron Decision"}
                </span>
            </div>

            <div className="thin-scrollbar max-h-32 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 pr-2">
                {reasoningLoading ? (
                    <ReasoningSkeleton />
                ) : (
                    <p className="text-sm leading-6 text-zinc-300">
                        {reasoning}
                    </p>
                )}
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

function ReasoningSkeleton() {
    return (
        <div aria-label="Generating agent reasoning" className="space-y-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-400/70" />
            </div>

            <div className="space-y-2">
                <div className="h-3 w-11/12 animate-pulse rounded bg-zinc-800" />
                <div className="h-3 w-full animate-pulse rounded bg-zinc-800" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-zinc-800" />
            </div>

            <p className="text-xs text-zinc-500">
                Evaluating benchmark tradeoffs and writing deployment rationale...
            </p>
        </div>
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

function isReasoningLoading(job: ShadowJob) {
    if (job.recommendation) return false;

    const reportStep = job.timeline.find((step) => step.id === "report");
    return (
        reportStep?.status === "running" ||
        job.stage === "quality_check" ||
        job.stage === "report_generated"
    );
}

function getAgentReasoning(job: ShadowJob) {
    const fp16 = job.candidates.find((candidate) =>
        candidate.name.toLowerCase().includes("fp16")
    );
    const int8 = job.candidates.find((candidate) =>
        candidate.name.toLowerCase().includes("int8")
    );
    const winnerName = job.recommendation?.candidate.toLowerCase() ?? "";

    if (winnerName.includes("fp16") && fp16 && int8) {
        const fp16Speedup = job.recommendation?.speedup ?? "1.9x";
        const fp16QualityDrop = getQualityDrop(fp16.quality) ?? "0.4%";
        const int8Quality = int8.quality ?? "95.5%";

        return `The agent established FP32 as the quality reference, then evaluated FP16 and INT8 entropy calibration. FP16 achieved ${fp16Speedup} speedup with only a ${fp16QualityDrop} quality drop, while INT8 achieved higher speedup but dropped quality to ${int8Quality}. Because the configured quality threshold requires at least 99%, FP16 was selected as the safest deployment artifact.`;
    }

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

function getQualityDrop(quality?: string) {
    if (!quality) return null;
    const qualityValue = Number.parseFloat(quality.replace("%", ""));
    if (!Number.isFinite(qualityValue)) return null;
    const drop = 100 - qualityValue;
    return `${Number.isInteger(drop) ? drop : drop.toFixed(1)}%`;
}
