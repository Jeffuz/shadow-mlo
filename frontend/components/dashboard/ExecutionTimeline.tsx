import type { TimelineStep } from "../types/shadow-mlo";
import { StatusDot } from "../ui/StatusDot";

interface ExecutionTimelineProps {
    steps: TimelineStep[];
}

export function ExecutionTimeline({ steps }: ExecutionTimelineProps) {
    return (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <div className="mb-5 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-white">
                        Execution Timeline
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500">
                        Live agent state from artifact detection to report generation.
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {steps.map((step, index) => (
                    <div
                        key={step.id}
                        className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-3"
                    >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-xs text-zinc-400">
                            {index + 1}
                        </div>

                        <StatusDot status={step.status} />

                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-200">
                                {step.label}
                            </p>
                            <p className="text-xs text-zinc-500">
                                {step.timestamp ?? "Waiting"}
                            </p>
                        </div>

                        <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs capitalize text-zinc-400">
                            {step.status}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}