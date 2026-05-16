import type { StepStatus } from "../types/shadow-mlo";

interface StatusDotProps {
    status: StepStatus;
}

const dotStyles: Record<StepStatus, string> = {
    pending: "bg-zinc-600",
    queued: "bg-sky-400",
    running: "bg-amber-400 animate-pulse",
    success: "bg-emerald-400",
    failed: "bg-red-400",
    skipped: "bg-zinc-500",
};

export function StatusDot({ status }: StatusDotProps) {
    return (
        <span className="relative flex h-3 w-3 shrink-0">
            <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${status === "running" ? "animate-ping bg-amber-400" : ""
                    }`}
            />
            <span
                className={`relative inline-flex h-3 w-3 rounded-full ${dotStyles[status]
                    }`}
            />
        </span>
    );
}