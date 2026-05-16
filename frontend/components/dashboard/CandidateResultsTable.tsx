import type { CandidateResult } from "../types/shadow-mlo";
import { StatusBadge } from "../ui/StatusBadge";

interface CandidateResultsTableProps {
    candidates: CandidateResult[];
}

export function CandidateResultsTable({ candidates }: CandidateResultsTableProps) {
    return (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <div className="mb-5">
                <h3 className="text-sm font-semibold text-white">
                    Candidate Results
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                    Runtime-specific builds, benchmarks, quality checks, and generated
                    artifacts.
                </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-800">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                    <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-500">
                        <tr>
                            <Th>Candidate</Th>
                            <Th>Runtime</Th>
                            <Th>Status</Th>
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
                                            <p className="mt-1 text-xs text-zinc-500">
                                                {candidate.reason}
                                            </p>
                                        ) : null}
                                    </div>
                                </Td>
                                <Td>{candidate.runtime}</Td>
                                <Td>
                                    <StatusBadge status={candidate.status} />
                                </Td>
                                <Td>{candidate.latency ?? "—"}</Td>
                                <Td>{candidate.throughput ?? "—"}</Td>
                                <Td>{candidate.memory ?? "—"}</Td>
                                <Td>{candidate.quality ?? "—"}</Td>
                                <Td>
                                    <span className="font-mono text-xs text-emerald-300">
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

function Th({ children }: { children: React.ReactNode }) {
    return <th className="px-4 py-3 font-medium">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
    return <td className="px-4 py-4 text-zinc-400">{children}</td>;
}