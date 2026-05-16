"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ExecutionTimeline } from "@/components/dashboard/ExecutionTimeline";
import { CandidateResultsTable } from "@/components/dashboard/CandidateResultsTable";
import { RecommendationCard } from "@/components/dashboard/RecommendationCard";
import { ActivityLog } from "@/components/dashboard/ActivityLog";
import { AgentPlanCard } from "@/components/dashboard/AgentPlanCard";
import { ArtifactClassificationCard } from "@/components/dashboard/ArtifactClassificationCard";
import { DeviceProfileCard } from "@/components/dashboard/DeviceProfileCard";
import { RuntimeRouteCard } from "@/components/dashboard/RuntimeRouteCard";
import { AgentReasoningCard } from "@/components/dashboard/AgentReasoningCard";
import { useJob } from "@/components/lib/useJob";

export default function JobDetailPage() {
    const params = useParams<{ jobId: string }>();
    const jobId = typeof params.jobId === "string" ? params.jobId : null;
    const { job, loading } = useJob(jobId);

    return (
        <AppShell>
            {loading ? (
                <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
                    Loading job…
                </div>
            ) : !job ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-zinc-500">
                    <p>Job not found.</p>
                    <Link
                        href="/jobs"
                        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-emerald-400/40 hover:text-emerald-300"
                    >
                        Back to jobs
                    </Link>
                </div>
            ) : (
            <div className="space-y-3">
                <Link
                    href="/jobs"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                >
                    <BackIcon />
                    Back to jobs
                </Link>
                <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 mt-3">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0">

                            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
                                <h1 className="truncate font-mono text-xl font-semibold text-white">
                                    {job.artifactName}
                                </h1>
                                <StatusBadge status={job.status} />
                                <Pill>{job.runtimePath}</Pill>
                                <Pill>{job.targetDevice}</Pill>
                                <Pill>{job.modelFamily}</Pill>
                            </div>

                            <p className="mt-1 truncate text-sm text-zinc-400">
                                {job.artifactType} routed through{" "}
                                <span className="text-zinc-200">{job.runtimePath}</span>
                            </p>
                        </div>

                        <div className="grid shrink-0 grid-cols-2 gap-x-8 gap-y-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-xs xl:grid-cols-4">
                            <Meta label="Job" value={job.id} mono />
                            <Meta label="Owner" value={job.owner ?? "local"} />
                            <Meta label="Started" value={job.startedAt} />
                            <Meta label="Updated" value={job.updatedAt ?? "—"} />
                        </div>
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <DetailMetric label="Stage" value={formatStage(job.stage ?? job.status)} />
                    <DetailMetric label="Runtime" value={job.runtimePath} />
                    <DetailMetric
                        label="Candidates"
                        value={`${job.candidates.length}`}
                        helper={`${job.candidates.filter((c) => c.status === "success").length} successful`}
                    />
                    <DetailMetric
                        label="Recommendation"
                        value={job.recommendation?.candidate ?? "Pending"}
                        helper={job.recommendation?.speedup ?? "after benchmark"}
                    />
                </section>

                <RecommendationCard job={job} />


                <ExecutionTimeline steps={job.timeline} />

                <CandidateResultsTable
                    candidates={job.candidates}
                    recommendation={job.recommendation}
                />


                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr_1fr]">
                    <ArtifactClassificationCard classification={job.classification} />
                    <DeviceProfileCard deviceProfile={job.deviceProfile} />
                    <AgentPlanCard plan={job.plan} />
                </div>

                <RuntimeRouteCard job={job} />
                <AgentReasoningCard job={job} />
                <ActivityLog events={job.events ?? []} />

                <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                    <div className="mb-3">
                        <h2 className="text-sm font-semibold text-white">
                            Generated Artifacts
                        </h2>
                        <p className="mt-0.5 text-xs text-zinc-500">
                            Candidate outputs produced or attempted by this optimization job.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                        {job.candidates.map((candidate) => (
                            <div
                                key={candidate.name}
                                className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-white">
                                            {candidate.name}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-zinc-500">
                                            {candidate.runtime}
                                        </p>
                                    </div>

                                    <StatusBadge status={candidate.status} />
                                </div>

                                <div className="mt-3 space-y-1.5 text-xs">
                                    <ArtifactInfo label="Latency" value={candidate.latency ?? "—"} />
                                    <ArtifactInfo
                                        label="Throughput"
                                        value={candidate.throughput ?? "—"}
                                    />
                                    <ArtifactInfo label="Memory" value={candidate.memory ?? "—"} />
                                    <ArtifactInfo label="Quality" value={candidate.quality ?? "—"} />
                                </div>

                                <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-1.5">
                                    <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                                        Artifact
                                    </p>
                                    <p className="mt-0.5 truncate font-mono text-xs text-emerald-300">
                                        {candidate.artifact ?? candidate.reason ?? "Not generated"}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
            )}
        </AppShell>
    );
}

function BackIcon() {
    return (
        <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M15 18l-6-6 6-6" />
        </svg>
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
        <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wide text-zinc-500">{label}</p>
            <p
                className={`mt-0.5 truncate text-[11px] text-zinc-200 ${mono ? "font-mono" : ""
                    }`}
            >
                {value}
            </p>
        </div>
    );
}

function DetailMetric({
    label,
    value,
    helper,
}: {
    label: string;
    value: string;
    helper?: string;
}) {
    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                {label}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
                <p className="truncate text-base font-semibold text-white">{value}</p>
                {helper ? <p className="truncate text-xs text-zinc-500">{helper}</p> : null}
            </div>
        </div>
    );
}

function ArtifactInfo({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <p className="text-zinc-500">{label}</p>
            <p className="truncate font-medium text-zinc-200">{value}</p>
        </div>
    );
}

function formatStage(stage: string) {
    return stage
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}
