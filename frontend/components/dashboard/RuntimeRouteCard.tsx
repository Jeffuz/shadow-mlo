import type { ShadowJob } from "../types/shadow-mlo";

interface RuntimeRouteCardProps {
    job: ShadowJob;
}

export function RuntimeRouteCard({ job }: RuntimeRouteCardProps) {
    const routes = [
        {
            label: "ONNX / Vision",
            runtime: "TensorRT",
            active: job.runtimePath === "TensorRT",
        },
        {
            label: "LLM / Transformer",
            runtime: "TensorRT-LLM",
            active: job.runtimePath === "TensorRT-LLM",
        },
        {
            label: "Existing Engine",
            runtime: "Benchmark Only",
            active: job.runtimePath === "Benchmark Only",
        },
        {
            label: "Unsupported",
            runtime: "Conversion Required",
            active: job.runtimePath === "Unsupported",
        },
    ];

    return (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="mb-2 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-white">Runtime Route</h3>
                    <p className="mt-0.5 text-xs text-zinc-500">
                        Classified artifact routed to compatible runner.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
                {routes.map((route) => (
                    <div
                        key={route.label}
                        className={`rounded-xl border px-3 py-2 ${route.active
                                ? "border-emerald-400/40 bg-emerald-400/10"
                                : "border-zinc-800 bg-zinc-950/60"
                            }`}
                    >
                        <p
                            className={`truncate text-xs font-medium ${route.active ? "text-emerald-300" : "text-zinc-300"
                                }`}
                        >
                            {route.label}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                            {route.runtime}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
