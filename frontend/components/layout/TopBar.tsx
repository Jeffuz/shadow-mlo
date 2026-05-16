export function TopBar() {
    return (
        <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/85 px-4 py-3 backdrop-blur lg:px-5">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-400">
                        Spark Track
                    </p>
                    <h2 className="mt-0.5 text-lg font-semibold text-white">
                        Autonomous Edge Model Optimization
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                        Agent Active
                    </span>
                    <span className="hidden rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 sm:inline-flex">
                        Watching /models/incoming
                    </span>
                </div>
            </div>
        </header>
    );
}