import type { TimelineStep } from "../types/shadow-mlo";
import { StatusDot } from "../ui/StatusDot";

interface ExecutionTimelineProps {
    steps: TimelineStep[];
}

export function ExecutionTimeline({ steps }: ExecutionTimelineProps) {
    return (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-white">
                        Execution Timeline
                    </h3>
                    <p className="mt-0.5 text-xs text-zinc-500">
                        Detection → routing → build → benchmark → report.
                    </p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <div className="flex min-w-[850px] items-center gap-2">
                    {steps.map((step, index) => (
                        <div key={step.id} className="flex flex-1 items-center">
                            <div className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-[11px] text-zinc-400">
                                        {index + 1}
                                    </span>
                                    <StatusDot status={step.status} />
                                    <span className="ml-auto rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] capitalize text-zinc-400">
                                        {step.status}
                                    </span>
                                </div>

                                <p className="mt-2 truncate text-xs font-medium text-zinc-200">
                                    {step.label}
                                </p>
                                <p className="mt-0.5 text-[11px] text-zinc-500">
                                    {step.timestamp ?? "Waiting"}
                                </p>
                            </div>

                            {index < steps.length - 1 ? (
                                <div className="mx-1 h-px w-4 shrink-0 bg-zinc-700" />
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
