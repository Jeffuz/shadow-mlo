import type { ShadowJob } from "../types/shadow-mlo";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:7860";

export async function getLatestJob(): Promise<ShadowJob | null> {
    try {
        const res = await fetch(`${API_BASE}/api/jobs/latest`, { cache: "no-store" });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

export async function getAllJobs(): Promise<ShadowJob[]> {
    try {
        const res = await fetch(`${API_BASE}/api/jobs`, { cache: "no-store" });
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

export async function getJob(jobId: string): Promise<ShadowJob | null> {
    try {
        const res = await fetch(`${API_BASE}/api/jobs/${encodeURIComponent(jobId)}`, {
            cache: "no-store",
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

export async function uploadArtifact(file: File): Promise<{ artifact: string; filename: string }> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: formData,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data.error ?? "Upload failed");
    }

    return data;
}
