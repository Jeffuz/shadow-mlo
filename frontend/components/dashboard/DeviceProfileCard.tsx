import type { ShadowJob } from "../types/shadow-mlo";

interface DeviceProfileCardProps {
    deviceProfile: ShadowJob["deviceProfile"];
}

export function DeviceProfileCard({ deviceProfile }: DeviceProfileCardProps) {
    return (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <h3 className="text-sm font-semibold text-white">
                Device Capability Match
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
                Local device profile used by the planner.
            </p>

            {deviceProfile ? (
                <div className="mt-5 space-y-4">
                    <div>
                        <p className="text-xs text-zinc-500">Target Device</p>
                        <p className="mt-1 text-lg font-semibold text-white">
                            {deviceProfile.name}
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <Capability label="CUDA" enabled={deviceProfile.cuda} />
                        <Capability label="TensorRT" enabled={deviceProfile.tensorrt} />
                        <Capability
                            label="TRT-LLM"
                            enabled={deviceProfile.tensorrtLlm}
                        />
                    </div>

                    <div>
                        <p className="text-xs text-zinc-500">Supported Precisions</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {deviceProfile.supportedPrecisions.map((precision) => (
                                <span
                                    key={precision}
                                    className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                                >
                                    {precision}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
                        <p className="text-xs text-zinc-500">Memory Budget</p>
                        <p className="mt-1 text-sm font-medium text-zinc-200">
                            {deviceProfile.memoryBudget}
                        </p>
                    </div>
                </div>
            ) : (
                <p className="mt-5 text-sm text-zinc-500">Device profile pending.</p>
            )}
        </section>
    );
}

function Capability({
    label,
    enabled,
}: {
    label: string;
    enabled: boolean;
}) {
    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
            <p className="text-xs text-zinc-500">{label}</p>
            <p
                className={`mt-1 text-sm font-semibold ${enabled ? "text-emerald-300" : "text-zinc-500"
                    }`}
            >
                {enabled ? "Yes" : "No"}
            </p>
        </div>
    );
}