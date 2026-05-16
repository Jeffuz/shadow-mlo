import { ShadowJob } from "../types/shadow-mlo";
import { mockJob } from "../mock/mockJob";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function getLatestJob(): Promise<ShadowJob> {
    try {
        const res = await fetch(`${API_BASE}/api/jobs/latest`, {
            cache: "no-store",
        });

        if (!res.ok) throw new Error("Failed to fetch latest job");

        return await res.json();
    } catch {
        return mockJob;
    }
}
