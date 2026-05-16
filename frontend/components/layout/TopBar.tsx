export function TopBar() {
    return (
        <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/80 px-6 py-4 backdrop-blur lg:px-8">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-emerald-400">
                        Spark Track
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-white">
                        Autonomous Edge Model Optimization
                    </h2>
                </div>

                <div className="flex items-center gap-3">
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