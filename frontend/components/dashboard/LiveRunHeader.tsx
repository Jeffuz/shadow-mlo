import type { ShadowJob } from "../types/shadow-mlo";
import { StatusBadge } from "../ui/StatusBadge";

interface LiveRunHeaderProps {
    job: ShadowJob;
}

export function LiveRunHeader({ job }: LiveRunHeaderProps) {
    return (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-2">
            <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                    <h1 className="truncate font-mono text-lg font-semibold tracking-tight text-white">
                        {job.artifactName}
                    </h1>

                    <StatusBadge status={job.status} />

                    <Pill>{job.runtimePath}</Pill>
                    <Pill>{job.targetDevice}</Pill>
                    <Pill>{job.modelFamily}</Pill>

                    <span className="hidden text-xs text-zinc-600 xl:inline">|</span>

                    <p className="truncate text-xs text-zinc-400">
                        {job.artifactType} routed to{" "}
                        <span className="text-zinc-200">{job.runtimePath}</span>
                    </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                    <Meta label="Job" value={job.id} mono />
                    <Divider />
                    <Meta label="Owner" value={job.owner ?? "local"} />
                    <Divider />
                    <Meta label="Started" value={job.startedAt} />
                    <Divider />
                    <Meta label="Updated" value={job.updatedAt ?? "—"} />
                </div>
            </div>
        </section>
    );
}

function Pill({ children }: { children: React.ReactNode }) {
    return (
        <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-400">
            {children}
        </span>
    );
}

function Meta({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <span className="whitespace-nowrap">
            <span className="mr-1 uppercase tracking-wide text-zinc-600">
                {label}:
            </span>
            <span className={mono ? "font-mono text-zinc-300" : "text-zinc-300"}>
                {value}
            </span>
        </span>
    );
}

function Divider() {
    return <span className="text-zinc-700">•</span>;
}
