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

            <div className="thin-scrollbar overflow-x-auto pb-1">
                <div className="flex min-w-max items-start">
                    {steps.map((step, index) => (
                        <div key={step.id} className="flex items-stretch">
                            <div className={`min-h-24 w-56 rounded-xl border px-3 py-2.5 shadow-lg shadow-black/10 ${getStepTone(step.status)}`}>
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
                                <div className="mx-2 flex w-5 shrink-0 items-center">
                                    <div className="h-px flex-1 bg-zinc-700/80" />
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function getStepTone(status: TimelineStep["status"]) {
    if (status === "success") {
        return "border-emerald-400/25 bg-emerald-400/[0.04]";
    }

    if (status === "running") {
        return "border-amber-400/30 bg-amber-400/[0.06] ring-1 ring-amber-400/10";
    }

    if (status === "failed") {
        return "border-red-400/30 bg-red-400/[0.06]";
    }

    if (status === "skipped") {
        return "border-zinc-700 bg-zinc-950/40 opacity-70";
    }

    return "border-zinc-800 bg-zinc-950/50";
}
