interface AgentPlanCardProps {
    plan: string[];
}

export function AgentPlanCard({ plan }: AgentPlanCardProps) {
    const visiblePlan = plan.filter(
        (item) => !item.toLowerCase().startsWith("reasoning:")
    );

    return (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-sm font-semibold text-white">Agent Plan</h3>
                    <p className="mt-0.5 text-xs text-zinc-500">
                        Condensed planner output.
                    </p>
                </div>
            </div>

            {visiblePlan.length > 0 ? (
                <ol className="space-y-1.5">
                    {visiblePlan.map((item, index) => (
                        <li
                            key={`${item}-${index}`}
                            className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2"
                        >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-[11px] font-semibold text-emerald-300">
                                {index + 1}
                            </span>
                            <p className="truncate text-xs text-zinc-300">{item}</p>
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="text-sm text-zinc-500">Plan pending.</p>
            )}
        </section>
    );
}