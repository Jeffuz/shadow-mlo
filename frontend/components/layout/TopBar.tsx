"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { uploadArtifact } from "@/components/lib/api";

const navItems = [
    { label: "Overview", href: "/" },
    { label: "Jobs", href: "/jobs" },
];

export function TopBar() {
    const pathname = usePathname();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    function isActive(href: string) {
        if (href === "/") {
            return pathname === "/";
        }

        return pathname === href || pathname.startsWith(`${href}/`);
    }

    async function handleUpload(file: File | undefined) {
        if (!file) return;

        setUploading(true);
        setUploadError(null);

        try {
            await uploadArtifact(file);
            router.push("/");
        } catch (error) {
            setUploadError(error instanceof Error ? error.message : "Upload failed");
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    }

    return (
        <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/85 px-4 py-3 backdrop-blur lg:px-5">
            <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
                <Link href="/" className="flex shrink-0 items-center px-1 md:justify-self-start">
                    <Image
                        src="/logos.png"
                        alt="Shadow-MLO logo"
                        width={180}
                        height={52}
                        priority
                        className="h-10 w-auto object-contain"
                    />
                </Link>

                <div className="flex items-center gap-2 md:justify-self-center">
                    {uploadError ? (
                        <span className="hidden max-w-64 truncate text-xs text-red-300 md:inline">
                            {uploadError}
                        </span>
                    ) : null}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".onnx,.pt,.gguf"
                        className="hidden"
                        onChange={(event) => handleUpload(event.target.files?.[0])}
                    />

                    <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-400/40 bg-zinc-900 px-3.5 py-1.5 text-sm font-medium text-emerald-300 transition hover:border-emerald-300/60 hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <UploadIcon />
                        {uploading ? "Uploading" : "Upload Model"}
                    </button>
                </div>

                <nav className="flex items-center justify-end gap-2">
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

function UploadIcon() {
    return (
        <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M20 16.5V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3.5" />
        </svg>
    );
}
