import type { JobStatus, StepStatus } from "../types/shadow-mlo";

type Status = JobStatus | StepStatus;

interface StatusBadgeProps {
    status: Status;
}

const statusStyles: Record<string, string> = {
    idle: "border-zinc-700 bg-zinc-800 text-zinc-300",
    queued: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    pending: "border-zinc-700 bg-zinc-800 text-zinc-400",
    running: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    completed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    failed: "border-red-400/30 bg-red-400/10 text-red-300",
    skipped: "border-zinc-700 bg-zinc-800 text-zinc-400",
};

export function StatusBadge({ status }: StatusBadgeProps) {
    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[status] ?? statusStyles.pending
                }`}
        >
            {status}
        </span>
    );
}