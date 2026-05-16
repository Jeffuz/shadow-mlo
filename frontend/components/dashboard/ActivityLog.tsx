import type { ShadowJob } from "../types/shadow-mlo";
import { StatusDot } from "../ui/StatusDot";

interface ActivityLogProps {
    events: NonNullable<ShadowJob["events"]>;
}

export function ActivityLog({ events }: ActivityLogProps) {
    return (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <div className="mb-5">
                <h3 className="text-sm font-semibold text-white">Activity Log</h3>
                <p className="mt-1 text-xs text-zinc-500">
                    Tool calls, planner events, and pipeline updates.
                </p>
            </div>

            <div className="space-y-2">
                {events.length > 0 ? (
                    events.map((event, index) => (
                        <div
                            key={`${event.timestamp}-${index}`}
                            className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3"
                        >
                            <StatusDot status={event.status} />

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xs text-zinc-500">
                                        {event.timestamp}
                                    </span>
                                    <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-400">
                                        {event.type}
                                    </span>
                                    {event.tool ? (
                                        <span className="font-mono text-xs text-emerald-300">
                                            {event.tool}
                                        </span>
                                    ) : null}
                                </div>

                                <p className="mt-1 text-sm text-zinc-300">{event.message}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-zinc-500">No activity yet.</p>
                )}
            </div>
        </section>
    );
}