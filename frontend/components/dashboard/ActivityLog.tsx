import type { ShadowJob } from "../types/shadow-mlo";
import { StatusDot } from "../ui/StatusDot";

interface ActivityLogProps {
    events: NonNullable<ShadowJob["events"]>;
}

export function ActivityLog({ events }: ActivityLogProps) {
    return (
        <section className="h-full rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="mb-2">
                <h3 className="text-sm font-semibold text-white">Latest Activity</h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                    Recent tool calls and planner events.
                </p>
            </div>

            <div className="space-y-2">
                {events.length > 0 ? (
                    events.map((event, index) => (
                        <div
                            key={`${event.timestamp}-${index}`}
                            className="flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2"
                        >
                            <div className="mt-1">
                                <StatusDot status={event.status} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-[10px] text-zinc-500">
                                        {event.timestamp}
                                    </span>

                                    {event.tool ? (
                                        <span className="truncate font-mono text-[10px] text-emerald-300">
                                            {event.tool}
                                        </span>
                                    ) : null}
                                </div>

                                <p className="mt-0.5 line-clamp-1 text-xs text-zinc-300">
                                    {event.message}
                                </p>
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
