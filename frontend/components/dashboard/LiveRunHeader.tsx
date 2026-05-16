import type { ShadowJob } from "../types/shadow-mlo";
import { StatusBadge } from "../ui/StatusBadge";

interface LiveRunHeaderProps {
    job: ShadowJob;
}

export function LiveRunHeader({ job }: LiveRunHeaderProps) {
    return (
        <section className="rounded-3xl border border-zinc-800 bg-linear-to-br from-zinc-900 to-zinc-950 p-4 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <StatusBadge status={job.status} />
                        <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
                            {job.runtimePath}
                        </span>
                        <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
                            {job.targetDevice}
                        </span>
                    </div>

                    <h1 className="mt-5 font-mono text-3xl font-semibold tracking-tight text-white">
                        {job.artifactName}
                    </h1>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                        Shadow-MLO classified this artifact as{" "}
                        <span className="text-zinc-200">{job.artifactType}</span>, routed it
                        through{" "}
                        <span className="text-zinc-200">{job.runtimePath}</span>, and is
                        evaluating deployment candidates for{" "}
                        <span className="text-zinc-200">{job.targetDevice}</span>.
                    </p>
                </div>

                <div className="grid min-w-64 grid-cols-2 gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                    <Meta label="Job ID" value={job.id} mono />
                    <Meta label="Owner" value={job.owner ?? "local"} />
                    <Meta label="Started" value={job.startedAt} />
                    <Meta label="Updated" value={job.updatedAt ?? "—"} />
                </div>
            </div>
        </section>
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
        <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                {label}
            </p>
            <p
                className={`mt-1 truncate text-xs text-zinc-200 ${mono ? "font-mono" : ""
                    }`}
            >
                {value}
            </p>
        </div>
    );
}