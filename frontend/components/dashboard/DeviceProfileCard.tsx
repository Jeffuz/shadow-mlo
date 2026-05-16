import type { ShadowJob } from "../types/shadow-mlo";

interface DeviceProfileCardProps {
    deviceProfile: ShadowJob["deviceProfile"];
}

export function DeviceProfileCard({ deviceProfile }: DeviceProfileCardProps) {
    return (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
            <h3 className="text-sm font-semibold text-white">Device</h3>
            <p className="mt-0.5 text-xs text-zinc-500">Target capability profile.</p>

            {deviceProfile ? (
                <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-500">Target</p>
                        <p className="text-sm font-semibold text-white">
                            {deviceProfile.name}
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                        <Capability label="CUDA" enabled={deviceProfile.cuda} />
                        <Capability label="TRT" enabled={deviceProfile.tensorrt} />
                        <Capability label="LLM" enabled={deviceProfile.tensorrtLlm} />
                    </div>

                    <div className="flex flex-wrap gap-1">
                        {deviceProfile.supportedPrecisions.slice(0, 5).map((precision) => (
                            <span
                                key={precision}
                                className="rounded-full border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300"
                            >
                                {precision}
                            </span>
                        ))}
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-2 py-1.5">
                        <p className="text-[10px] text-zinc-500">Memory</p>
                        <p className="text-xs font-medium text-zinc-200">
                            {deviceProfile.memoryBudget}
                        </p>
                    </div>
                </div>
            ) : (
                <p className="mt-3 text-sm text-zinc-500">Device profile pending.</p>
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
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1.5">
            <p className="text-[9px] text-zinc-500">{label}</p>
            <p
                className={`text-[11px] font-semibold ${enabled ? "text-emerald-300" : "text-zinc-500"
                    }`}
            >
                {enabled ? "Yes" : "No"}
            </p>
        </div>
    );
}
