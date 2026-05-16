interface AgentPlanCardProps {
    plan: string[];
}

export function AgentPlanCard({ plan }: AgentPlanCardProps) {
    return (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <h3 className="text-sm font-semibold text-white">Agent Plan</h3>
            <p className="mt-1 text-xs text-zinc-500">
                Planner output based on artifact classification, target device, and
                memory history.
            </p>

            {plan.length > 0 ? (
                <ol className="mt-5 space-y-3">
                    {plan.map((item, index) => (
                        <li
                            key={`${item}-${index}`}
                            className="flex gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3"
                        >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-xs font-semibold text-emerald-300">
                                {index + 1}
                            </span>
                            <p className="text-sm leading-6 text-zinc-300">{item}</p>
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="mt-5 text-sm text-zinc-500">Plan pending.</p>
            )}
        </section>
    );
}