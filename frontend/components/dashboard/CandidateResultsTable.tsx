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

            <div className="overflow-hidden rounded-xl border border-zinc-800">
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
    const tone = lowerDecision.includes("recommended")
        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
        : lowerDecision.includes("rejected") || lowerDecision.includes("failed")
            ? "border-red-400/30 bg-red-400/10 text-red-300"
            : lowerDecision.includes("reference")
                ? "border-sky-400/30 bg-sky-400/10 text-sky-300"
                : "border-zinc-700 bg-zinc-950/60 text-zinc-400";

    return (
        <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] ${tone}`}>
            {decision}
        </span>
    );
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
