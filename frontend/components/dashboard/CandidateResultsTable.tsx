"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CandidateResult, JobStage, JobStatus, ShadowJob } from "../types/shadow-mlo";
import { StatusBadge } from "../ui/StatusBadge";
import { API_BASE } from "../lib/api";

interface CandidateResultsTableProps {
    candidates: CandidateResult[];
    recommendation?: ShadowJob["recommendation"];
    stage?: JobStage | JobStatus;
}

export function CandidateResultsTable({
    candidates,
    recommendation,
    stage,
}: CandidateResultsTableProps) {
    const loadingCandidates = candidates.length === 0 && isCandidateLoadingStage(stage);

    return (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="mb-2">
                <h3 className="text-sm font-semibold text-white">Candidate Results</h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                    Builds, benchmarks, quality checks, and artifacts.
                </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-800 thin-scrollbar">
                <table className="w-full min-w-[920px] border-collapse text-left text-xs">
                    <thead className="bg-zinc-950 text-[10px] uppercase tracking-wide text-zinc-500">
                        <tr>
                            <Th className="w-[160px]">Candidate</Th>
                            <Th>Runtime</Th>
                            <Th>Status</Th>
                            <Th>Decision</Th>
                            <Th>Latency</Th>
                            <Th>Throughput</Th>
                            <Th>Memory</Th>
                            <Th>Quality</Th>
                            <Th className="w-[260px]">Artifact</Th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-zinc-800 bg-zinc-950/40">
                        {loadingCandidates ? (
                            <CandidateSkeletonRow />
                        ) : (
                            candidates.map((candidate) => {
                            const primaryName = formatCandidatePrimary(candidate.name);
                            const secondaryName = formatCandidateSecondary(candidate.name);

                            return (
                                <tr key={candidate.name} className="hover:bg-zinc-900/80">
                                    <Td>
                                        <div className="min-w-[130px]">
                                            <p className="font-medium leading-5 text-zinc-200">
                                                {primaryName}
                                            </p>

                                            {secondaryName ? (
                                                <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">
                                                    {secondaryName}
                                                </p>
                                            ) : candidate.reason ? (
                                                <p className="mt-0.5 max-w-36 truncate text-[11px] leading-4 text-zinc-500">
                                                    {candidate.reason}
                                                </p>
                                            ) : null}
                                        </div>
                                    </Td>

                                    <Td>{candidate.runtime}</Td>

                                    <Td>
                                        <StatusBadge status={candidate.status} />
                                    </Td>

                                    <Td>
                                        <DecisionBadge
                                            decision={getCandidateDecision(candidate, recommendation)}
                                        />
                                    </Td>

                                    <Td>{candidate.latency ?? "—"}</Td>
                                    <Td>{candidate.throughput ?? "—"}</Td>
                                    <Td>{candidate.memory ?? "—"}</Td>
                                    <Td>{candidate.quality ?? "—"}</Td>

                                    <Td>
                                        <ArtifactCell artifact={candidate.artifact} />
                                    </Td>
                                </tr>
                            );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function CandidateSkeletonRow() {
    return (
        <tr aria-label="Generating candidate results">
            <Td>
                <div className="space-y-2">
                    <div className="h-3 w-28 animate-pulse rounded bg-zinc-800" />
                    <div className="h-2.5 w-20 animate-pulse rounded bg-zinc-800" />
                </div>
            </Td>
            <Td>
                <SkeletonCell width="w-20" />
            </Td>
            <Td>
                <SkeletonPill />
            </Td>
            <Td>
                <SkeletonPill />
            </Td>
            <Td>
                <SkeletonCell width="w-16" />
            </Td>
            <Td>
                <SkeletonCell width="w-20" />
            </Td>
            <Td>
                <SkeletonCell width="w-16" />
            </Td>
            <Td>
                <SkeletonCell width="w-14" />
            </Td>
            <Td>
                <SkeletonCell width="w-44" />
            </Td>
        </tr>
    );
}

function SkeletonCell({ width }: { width: string }) {
    return <div className={`h-3 animate-pulse rounded bg-zinc-800 ${width}`} />;
}

function SkeletonPill() {
    return <div className="h-5 w-24 animate-pulse rounded-full bg-zinc-800" />;
}

function ArtifactCell({ artifact }: { artifact?: string }) {
    const name = formatArtifactName(artifact);
    if (!artifact || name === "—") {
        return <span className="text-zinc-600">—</span>;
    }
    const downloadUrl = `${API_BASE}/api/download/${encodeURIComponent(name)}`;
    return (
        <a
            href={downloadUrl}
            title={`Download ${name}`}
            className="group inline-flex max-w-[260px] items-center gap-1 break-all font-mono text-[11px] leading-5 text-emerald-300 hover:text-emerald-200 hover:underline"
        >
            <span className="break-all">{name}</span>
            <svg
                className="h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
            >
                <path d="M8 1a.75.75 0 0 1 .75.75v6.19l1.97-1.97a.75.75 0 1 1 1.06 1.06L8 10.81 4.22 7.03a.75.75 0 0 1 1.06-1.06L7.25 7.94V1.75A.75.75 0 0 1 8 1ZM2.75 13.25a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1-.75-.75Z" />
            </svg>
        </a>
    );
}

function DecisionBadge({ decision }: { decision: string }) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{
        left: number;
        top: number;
    } | null>(null);
    const lowerDecision = decision.toLowerCase();
    const description = getDecisionDescription(decision);

    const tone = lowerDecision.includes("recommended")
        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
        : lowerDecision.includes("rejected") || lowerDecision.includes("failed")
            ? "border-red-400/30 bg-red-400/10 text-red-300"
            : lowerDecision.includes("reference")
                ? "border-sky-400/30 bg-sky-400/10 text-sky-300"
                : "border-zinc-700 bg-zinc-950/60 text-zinc-400";

    useEffect(() => {
        return () => {
            if (showTimerRef.current) {
                clearTimeout(showTimerRef.current);
            }
        };
    }, []);

    function showTooltip() {
        if (showTimerRef.current) {
            clearTimeout(showTimerRef.current);
        }

        showTimerRef.current = setTimeout(() => {
            const rect = buttonRef.current?.getBoundingClientRect();
            if (!rect) return;

            setTooltipPosition({
                left: Math.min(rect.left, window.innerWidth - 272),
                top: rect.bottom + 8,
            });
        }, 300);
    }

    function hideTooltip() {
        if (showTimerRef.current) {
            clearTimeout(showTimerRef.current);
        }

        setTooltipPosition(null);
    }

    return (
        <span className="inline-flex max-w-full">
            <button
                ref={buttonRef}
                type="button"
                aria-label={`${decision}: ${description}`}
                onMouseEnter={showTooltip}
                onMouseLeave={hideTooltip}
                onFocus={showTooltip}
                onBlur={hideTooltip}
                className={`inline-flex max-w-48 truncate whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] outline-none transition focus:ring-2 focus:ring-emerald-400/40 ${tone}`}
            >
                {decision}
            </button>

            {tooltipPosition && typeof document !== "undefined"
                ? createPortal(
                    <span
                        className="pointer-events-none fixed z-50 w-64 rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-left text-[11px] leading-5 text-zinc-300 opacity-100 shadow-2xl shadow-black/40"
                        style={{
                            left: tooltipPosition.left,
                            top: tooltipPosition.top,
                        }}
                    >
                        <span className="block font-semibold text-zinc-100">
                            {decision}
                        </span>
                        <span className="mt-1 block">{description}</span>
                    </span>,
                    document.body
                )
                : null}
        </span>
    );
}

function formatCandidatePrimary(name: string) {
    const lowerName = name.toLowerCase();

    if (lowerName.startsWith("fp32")) return "FP32 Baseline";
    if (lowerName.startsWith("fp16")) return "FP16";
    if (lowerName.startsWith("fp8")) return "FP8";
    if (lowerName.startsWith("int8")) return "INT8";
    if (lowerName.startsWith("bf16")) return "BF16 Baseline";
    if (lowerName.includes("baseline")) return name.replace(/\s*\(.*?\)\s*/g, "");

    return name.replace(/\s*\(.*?\)\s*/g, "").trim();
}

function formatCandidateSecondary(name: string) {
    const match = name.match(/\((.*?)\)/);
    return match?.[1]?.trim() ?? "";
}

function formatArtifactName(artifact?: string) {
    if (!artifact) return "—";
    const normalizedArtifact = artifact.replaceAll("\\", "/");
    const parts = normalizedArtifact.split("/").filter(Boolean);
    return parts.at(-1) ?? artifact;
}

function getDecisionDescription(decision: string) {
    const lowerDecision = decision.toLowerCase();

    if (lowerDecision.includes("recommended")) {
        return "Selected as the deployment artifact because it best satisfies the run's quality, performance, and memory tradeoffs.";
    }

    if (lowerDecision.includes("reference")) {
        return "Used as the baseline for quality and performance comparison. It is not usually the optimized deployment target.";
    }

    if (lowerDecision.includes("quality below threshold")) {
        return "Rejected because validation quality fell below the configured deployment threshold, even if speed or memory improved.";
    }

    if (lowerDecision.includes("rejected")) {
        return "Excluded from deployment because one or more run requirements were not satisfied.";
    }

    if (lowerDecision.includes("failed")) {
        return "The candidate did not complete successfully, so it cannot be recommended.";
    }

    if (lowerDecision.includes("skipped")) {
        return "The agent did not run this candidate because an earlier condition or dependency made it unnecessary or invalid.";
    }

    if (lowerDecision.includes("pending")) {
        return "The agent has not finished building, benchmarking, or validating this candidate yet.";
    }

    return "Evaluated by the agent, but not selected as the final deployment recommendation.";
}

function getCandidateDecision(
    candidate: CandidateResult,
    recommendation?: ShadowJob["recommendation"]
) {
    if (candidate.decision) return candidate.decision;

    const candidateName = candidate.name.toLowerCase();
    const recommendedName = recommendation?.candidate.toLowerCase();

    if (
        recommendation &&
        (candidateName === recommendedName ||
            candidate.artifact === recommendation.artifact)
    ) {
        return "Recommended";
    }

    if (candidateName.includes("fp32") || candidateName.includes("baseline")) {
        return "Reference";
    }

    const qualityValue = parsePercent(candidate.quality);
    if (recommendation && qualityValue !== null && qualityValue < 98) {
        return "Rejected: quality below threshold";
    }

    if (candidate.status === "failed") {
        return candidate.reason ? `Rejected: ${candidate.reason}` : "Failed";
    }

    if (candidate.status === "skipped") {
        return candidate.reason ? `Rejected: ${candidate.reason}` : "Skipped";
    }

    if (candidate.status === "queued" || candidate.status === "pending") {
        return "Pending";
    }

    return "Evaluated";
}

function isCandidateLoadingStage(stage?: JobStage | JobStatus) {
    return (
        stage === "idle" ||
        stage === "queued" ||
        stage === "running" ||
        stage === "artifact_detected" ||
        stage === "classified" ||
        stage === "device_profile_loaded" ||
        stage === "plan_generated" ||
        stage === "building_candidates" ||
        stage === "benchmarking"
    );
}

function parsePercent(value?: string) {
    if (!value) return null;
    const parsed = Number.parseFloat(value.replace("%", ""));
    return Number.isFinite(parsed) ? parsed : null;
}

function Th({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return <th className={`px-3 py-2 font-medium ${className}`}>{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
    return <td className="px-3 py-2.5 align-middle text-zinc-400">{children}</td>;
}
