import type { ReactNode } from "react";
import { TopBar } from "@/components/layout/TopBar";

interface AppShellProps {
    children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            <div className="flex min-h-screen">
                <div className="flex min-w-0 flex-1 flex-col">
                    <TopBar />

                    <main className="flex-1 overflow-x-hidden px-4 py-3 lg:px-5">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
