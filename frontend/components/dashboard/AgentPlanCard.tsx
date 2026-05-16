import type { JobStage, JobStatus } from "../types/shadow-mlo";

interface AgentPlanCardProps {
    plan: string[];
    stage?: JobStage | JobStatus;
}

export function AgentPlanCard({ plan, stage }: AgentPlanCardProps) {
    const visiblePlan = cleanPlan(plan);
    const planning = visiblePlan.length === 0 && isPlanningStage(stage);

    return (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-sm font-semibold text-white">Agent Plan</h3>
                    <p className="mt-0.5 text-xs text-zinc-500">
                        Condensed planner output.
                    </p>
                </div>

                {planning ? (
                    <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                        Planning
                    </span>
                ) : visiblePlan.length > 3 ? (
                    <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
                        {visiblePlan.length} steps
                    </span>
                ) : null}
            </div>

            {planning ? (
                <PlanSkeleton />
            ) : visiblePlan.length > 0 ? (
                <ol className="thin-scrollbar max-h-36 space-y-1.5 overflow-y-auto pr-1">
                    {visiblePlan.map((item, index) => (
                        <li
                            key={`${item}-${index}`}
                            className="flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2"
                        >
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-[11px] font-semibold text-emerald-300">
                                {index + 1}
                            </span>

                            <p className="text-xs leading-5 text-zinc-300">
                                {item}
                            </p>
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="text-sm text-zinc-500">Plan pending.</p>
            )}
        </section>
    );
}

function PlanSkeleton() {
    return (
        <div aria-label="Generating agent plan" className="space-y-1.5">
            {[0, 1, 2].map((item) => (
                <div
                    key={item}
                    className="flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2"
                >
                    <span className="mt-0.5 h-5 w-5 shrink-0 animate-pulse rounded-full bg-emerald-400/10" />
                    <div className="flex-1 space-y-2 py-1">
                        <div className="h-2.5 w-full animate-pulse rounded bg-zinc-800" />
                        <div className="h-2.5 w-2/3 animate-pulse rounded bg-zinc-800" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function isPlanningStage(stage?: JobStage | JobStatus) {
    return (
        stage === "idle" ||
        stage === "queued" ||
        stage === "running" ||
        stage === "artifact_detected" ||
        stage === "classified" ||
        stage === "device_profile_loaded" ||
        stage === "plan_generated"
    );
}

function cleanPlan(plan: string[]) {
    const seen = new Set<string>();

    return plan
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => !item.toLowerCase().startsWith("reasoning:"))
        .filter((item) => !item.toLowerCase().startsWith("as an ml optimization expert"))
        .filter((item) => !item.includes(", , ]"))
        .filter((item) => {
            const normalized = item.toLowerCase().replace(/\s+/g, " ");
            if (seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        });
}
