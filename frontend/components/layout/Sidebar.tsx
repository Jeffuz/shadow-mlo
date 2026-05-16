import Link from "next/link";

const navItems = [
    { label: "Overview", href: "/" },
    { label: "Jobs", href: "/jobs" },
    { label: "Reports", href: "/reports" },
    { label: "Policy", href: "/policy" },
];

export function Sidebar() {
    return (
        <aside className="hidden w-60 shrink-0 border-r border-zinc-800 bg-zinc-950/95 px-4 py-5 lg:block">
            <div className="mb-8">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-sm font-bold text-emerald-300">
                        SM
                    </div>

                    <div>
                        <h1 className="text-sm font-semibold tracking-wide text-white">
                            Shadow-MLO
                        </h1>
                        <p className="text-xs text-zinc-500">
                            Autonomous optimization agent
                        </p>
                    </div>
                </div>
            </div>

            <nav className="space-y-1">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="block rounded-xl px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
                    >
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-xs font-medium text-zinc-300">Local Runtime</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Jobs, reports, artifacts, and memory are stored locally for the Spark
                    demo.
                </p>
            </div>
        </aside>
    );
}