"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { label: "Overview", href: "/" },
    { label: "Jobs", href: "/jobs" },
];

export function TopBar() {
    const pathname = usePathname();

    function isActive(href: string) {
        if (href === "/") {
            return pathname === "/";
        }

        return pathname === href || pathname.startsWith(`${href}/`);
    }

    return (
        <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/85 px-4 py-3 backdrop-blur lg:px-5">
            <div className="flex items-center justify-between gap-4">
                <Link href="/" className="flex shrink-0 items-center px-1">
                    <Image
                        src="/logos.png"
                        alt="Shadow-MLO logo"
                        width={180}
                        height={52}
                        priority
                        className="h-10 w-auto object-contain"
                    />
                </Link>

                <nav className="flex items-center gap-2">
                    {navItems.map((item) => {
                        const active = isActive(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`rounded-xl border px-3 py-1.5 text-sm transition ${active
                                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 shadow-sm shadow-emerald-950/30"
                                    : "border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 hover:text-white"
                                    }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </header>
    );
}
