"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useJobs } from "@/components/lib/useJobs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { JobStatus } from "@/components/types/shadow-mlo";

type JobFilter = "all" | Extract<JobStatus, "running" | "completed" | "failed">;

const filters: { label: string; value: JobFilter }[] = [
    { label: "All", value: "all" },
    { label: "Running", value: "running" },
    { label: "Completed", value: "completed" },
    { label: "Failed", value: "failed" },
];

export default function JobsPage() {
    const [activeFilter, setActiveFilter] = useState<JobFilter>("all");
    const { jobs } = useJobs();

    const running = jobs.filter((job) => job.status === "running").length;
    const completed = jobs.filter((job) => job.status === "completed").length;
    const failed = jobs.filter((job) => job.status === "failed").length;

    const filteredJobs = useMemo(() => {
        if (activeFilter === "all") return jobs;
        return jobs.filter((job) => job.status === activeFilter);
    }, [activeFilter, jobs]);

    return (
        <AppShell>
            <div className="space-y-3">
                <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-white">
                                Optimization Jobs
                            </h1>
                            <p className="mt-1 text-sm text-zinc-500">
                                All artifact optimization runs across runtime paths and target
                                devices.
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-sm">
                            <JobStat label="Running" value={running} />
                            <JobStat label="Completed" value={completed} />
                            <JobStat label="Failed" value={failed} />
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
                    <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-white">Job Queue</h2>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                Runtime route, status, candidates, and recommendation state.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {filters.map((filter) => (
                                <FilterPill
                                    key={filter.value}
                                    active={activeFilter === filter.value}
                                    onClick={() => setActiveFilter(filter.value)}
                                >
                                    {filter.label}
                                    <span className="ml-1 text-[10px] opacity-70">
                                        {getFilterCount(filter.value)}
                                    </span>
                                </FilterPill>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-zinc-800">
                        <table className="w-full min-w-262.5 border-collapse text-left text-xs">
                            <thead className="bg-zinc-950 text-[10px] uppercase tracking-wide text-zinc-500">
                                <tr>
                                    <Th>Artifact</Th>
                                    <Th>Type</Th>
                                    <Th>Family</Th>
                                    <Th>Runtime</Th>
                                    <Th>Target</Th>
                                    <Th>Status</Th>
                                    <Th>Stage</Th>
                                    <Th>Best / Current</Th>
                                    <Th>Started</Th>
                                    <Th />
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-zinc-800 bg-zinc-950/40">
                                {filteredJobs.length > 0 ? (
                                    filteredJobs.map((job) => {
                                        const currentCandidate =
                                            job.recommendation?.candidate ??
                                            job.candidates.find(
                                                (candidate) => candidate.status === "running"
                                            )?.name ??
                                            "Pending";

                                        return (
                                            <tr key={job.id} className="hover:bg-zinc-900/80">
                                                <Td>
                                                    <div>
                                                        <Link
                                                            href={`/jobs/${job.id}`}
                                                            className="font-mono font-semibold text-white hover:text-emerald-300"
                                                        >
                                                            {job.artifactName}
                                                        </Link>
                                                        <p className="mt-0.5 font-mono text-[10px] text-zinc-600">
                                                            {job.id}
                                                        </p>
                                                    </div>
                                                </Td>

                                                <Td>{job.artifactType}</Td>
                                                <Td>{job.modelFamily}</Td>
                                                <Td>
                                                    <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300">
                                                        {job.runtimePath}
                                                    </span>
                                                </Td>
                                                <Td>{job.targetDevice}</Td>
                                                <Td>
                                                    <StatusBadge status={job.status} />
                                                </Td>
                                                <Td>{formatStage(job.stage ?? job.status)}</Td>
                                                <Td>
                                                    <span
                                                        className={
                                                            job.recommendation
                                                                ? "font-medium text-emerald-300"
                                                                : job.status === "failed"
                                                                    ? "font-medium text-red-300"
                                                                    : "font-medium text-amber-300"
                                                        }
                                                    >
                                                        {currentCandidate}
                                                    </span>
                                                </Td>
                                                <Td>{job.startedAt}</Td>
                                                <Td className="text-right">
                                                    <Link
                                                        href={`/jobs/${job.id}`}
                                                        className="rounded-lg border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-300 transition hover:border-emerald-400/40 hover:text-emerald-300"
                                                    >
                                                        View
                                                    </Link>
                                                </Td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="px-3 py-10 text-center">
                                            <p className="text-sm font-medium text-zinc-300">
                                                No jobs found.
                                            </p>
                                            <p className="mt-1 text-xs text-zinc-500">
                                                No optimization jobs match the selected filter.
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AppShell>
    );

    function getFilterCount(filter: JobFilter) {
        if (filter === "all") return jobs.length;
        return jobs.filter((job) => job.status === filter).length;
    }
}

function JobStat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                {label}
            </p>
            <p className="mt-0.5 text-base font-semibold text-white">{value}</p>
        </div>
    );
}

function FilterPill({
    children,
    active = false,
    onClick,
}: {
    children: React.ReactNode;
    active?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full border px-3 py-1 text-xs transition ${active
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                : "border-zinc-700 bg-zinc-950/60 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                }`}
        >
            {children}
        </button>
    );
}

function Th({
    children,
    className = "",
}: {
    children?: React.ReactNode;
    className?: string;
}) {
    return <th className={`px-3 py-2 font-medium ${className}`}>{children}</th>;
}

function Td({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return <td className={`px-3 py-3 text-zinc-400 ${className}`}>{children}</td>;
}

function formatStage(stage: string) {
    return stage
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}