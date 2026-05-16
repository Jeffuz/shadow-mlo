import type { ShadowJob } from "../types/shadow-mlo";

interface ArtifactClassificationCardProps {
    classification: ShadowJob["classification"];
}

export function ArtifactClassificationCard({
    classification,
}: ArtifactClassificationCardProps) {
    return (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
            <h3 className="text-sm font-semibold text-white">Artifact</h3>
            <p className="mt-0.5 text-xs text-zinc-500">Routing classification.</p>

            {classification ? (
                <div className="mt-3 space-y-1.5 text-xs">
                    <Info label="Format" value={classification.format} />
                    <Info label="Family" value={classification.family} />
                    <Info label="Params" value={classification.parameters ?? "—"} />
                    <Info
                        label="Context"
                        value={classification.contextLength ?? classification.inputShape ?? "—"}
                    />
                    <Info label="Runtime" value={classification.runtimePath} />
                </div>
            ) : (
                <p className="mt-3 text-sm text-zinc-500">Classification pending.</p>
            )}
        </section>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-zinc-500">{label}</p>
            <p className="truncate text-xs font-medium text-zinc-200">{value}</p>
        </div>
    );
}
