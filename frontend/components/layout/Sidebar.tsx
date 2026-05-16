"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { label: "Overview", href: "/" },
    { label: "Jobs", href: "/jobs" },
    // { label: "Reports", href: "/reports" },
    // { label: "Policy", href: "/policy" },
];

export function Sidebar() {
    const pathname = usePathname();

    function isActive(href: string) {
        if (href === "/") {
            return pathname === "/";
        }

        return pathname === href || pathname.startsWith(`${href}/`);
    }

    return (
        <aside className="hidden w-56 shrink-0 border-r border-zinc-800 bg-zinc-950/95 px-4 py-5 lg:block">
            <div className="mb-8">
                <Link href="/" className="block">
                    <Image
                        src="/logo.png"
                        alt="Shadow-MLO logo"
                        width={180}
                        height={80}
                        priority
                        className="h-14 w-full object-contain"
                    />
                </Link>
            </div>

            <nav className="space-y-1">
                {navItems.map((item) => {
                    const active = isActive(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`block rounded-xl px-3 py-2 text-sm transition ${active
                                ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 shadow-sm shadow-emerald-950/30"
                                : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                                }`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
