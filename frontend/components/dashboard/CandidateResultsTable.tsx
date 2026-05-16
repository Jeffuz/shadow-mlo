import type { CandidateResult, ShadowJob } from "../types/shadow-mlo";
import { StatusBadge } from "../ui/StatusBadge";

interface CandidateResultsTableProps {
    candidates: CandidateResult[];
    recommendation?: ShadowJob["recommendation"];
}

export function CandidateResultsTable({
    candidates,
    recommendation,
}: CandidateResultsTableProps) {
    return (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="mb-2">
                <h3 className="text-sm font-semibold text-white">Candidate Results</h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                    Builds, benchmarks, quality checks, and artifacts.
                </p>
            </div>

            <div className="overflow-visible rounded-xl border border-zinc-800">
                <table className="w-full min-w-[820px] border-collapse text-left text-xs">
                    <thead className="bg-zinc-950 text-[10px] uppercase tracking-wide text-zinc-500">
                        <tr>
                            <Th>Candidate</Th>
                            <Th>Runtime</Th>
                            <Th>Status</Th>
                            <Th>Decision</Th>
                            <Th>Latency</Th>
                            <Th>Throughput</Th>
                            <Th>Memory</Th>
                            <Th>Quality</Th>
                            <Th>Artifact</Th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-zinc-800 bg-zinc-950/40">
                        {candidates.map((candidate) => (
                            <tr key={candidate.name} className="hover:bg-zinc-900/80">
                                <Td>
                                    <div>
                                        <p className="font-medium text-zinc-200">
                                            {candidate.name}
                                        </p>
                                        {candidate.reason ? (
                                            <p className="mt-0.5 max-w-32 truncate text-[11px] text-zinc-500">
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
                                    <span className="font-mono text-[11px] text-emerald-300">
                                        {candidate.artifact ?? "—"}
                                    </span>
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function DecisionBadge({ decision }: { decision: string }) {
    const lowerDecision = decision.toLowerCase();
    const description = getDecisionDescription(decision);
    const tone = lowerDecision.includes("recommended")
        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
        : lowerDecision.includes("rejected") || lowerDecision.includes("failed")
            ? "border-red-400/30 bg-red-400/10 text-red-300"
            : lowerDecision.includes("reference")
                ? "border-sky-400/30 bg-sky-400/10 text-sky-300"
                : "border-zinc-700 bg-zinc-950/60 text-zinc-400";

    return (
        <span className="group relative inline-flex max-w-full">
            <button
                type="button"
                aria-label={`${decision}: ${description}`}
                className={`inline-flex max-w-48 truncate whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] outline-none transition focus:ring-2 focus:ring-emerald-400/40 ${tone}`}
            >
                {decision}
            </button>

            <span className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-left text-[11px] leading-5 text-zinc-300 opacity-0 shadow-2xl shadow-black/40 transition-opacity delay-200 duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                <span className="block font-semibold text-zinc-100">{decision}</span>
                <span className="mt-1 block">{description}</span>
            </span>
        </span>
    );
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
    if (recommendation && qualityValue !== null && qualityValue < 99) {
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

function parsePercent(value?: string) {
    if (!value) return null;
    const parsed = Number.parseFloat(value.replace("%", ""));
    return Number.isFinite(parsed) ? parsed : null;
}

function Th({ children }: { children: React.ReactNode }) {
    return <th className="px-3 py-2 font-medium">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
    return <td className="px-3 py-2.5 text-zinc-400">{children}</td>;
}
