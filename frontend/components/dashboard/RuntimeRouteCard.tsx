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
            runtime: "Report Required Conversion",
            active: job.runtimePath === "Unsupported",
        },
    ];

    return (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <h3 className="text-sm font-semibold text-white">Runtime Route</h3>
            <p className="mt-1 text-xs text-zinc-500">
                Generic artifact router selects the compatible optimization backend.
            </p>

            <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
                <div className="flex flex-col gap-3">
                    <RouteNode label="Artifact Detected" active />
                    <Connector />
                    <RouteNode label="Classifier" active />
                    <Connector />
                    <RouteNode label="Runtime Router" active />
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {routes.map((route) => (
                        <div
                            key={route.label}
                            className={`rounded-2xl border p-4 ${route.active
                                ? "border-emerald-400/40 bg-emerald-400/10"
                                : "border-zinc-800 bg-zinc-950/70"
                                }`}
                        >
                            <p
                                className={`text-sm font-medium ${route.active ? "text-emerald-300" : "text-zinc-300"
                                    }`}
                            >
                                {route.label}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">{route.runtime}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function RouteNode({ label, active }: { label: string; active?: boolean }) {
    return (
        <div
            className={`rounded-xl border px-3 py-2 text-sm ${active
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border-zinc-800 text-zinc-400"
                }`}
        >
            {label}
        </div>
    );
}

function Connector() {
    return <div className="ml-4 h-4 w-px bg-zinc-700" />;
}