import type { ShadowJob } from "../types/shadow-mlo";

interface ArtifactClassificationCardProps {
    classification: ShadowJob["classification"];
}

export function ArtifactClassificationCard({
    classification,
}: ArtifactClassificationCardProps) {
    return (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <h3 className="text-sm font-semibold text-white">
                Artifact Classification
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
                The router uses this to choose the optimization path.
            </p>

            {classification ? (
                <div className="mt-5 space-y-3">
                    <Info label="Format" value={classification.format} />
                    <Info label="Family" value={classification.family} />
                    <Info label="Parameters" value={classification.parameters ?? "—"} />
                    <Info
                        label="Context"
                        value={classification.contextLength ?? classification.inputShape ?? "—"}
                    />
                    <Info label="Precision" value={classification.precision ?? "—"} />
                    <Info label="Runtime" value={classification.runtimePath} />
                </div>
            ) : (
                <p className="mt-5 text-sm text-zinc-500">Classification pending.</p>
            )}
        </section>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-3 last:border-b-0 last:pb-0">
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="truncate text-sm font-medium text-zinc-200">{value}</p>
        </div>
    );
}