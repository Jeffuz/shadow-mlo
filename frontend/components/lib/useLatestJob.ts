"use client";

import { useEffect, useState } from "react";
import type { ShadowJob } from "../types/shadow-mlo";
import { getLatestJob, API_BASE } from "./api";

export function useLatestJob() {
    const [job, setJob] = useState<ShadowJob | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;

        getLatestJob().then((data) => {
            if (alive) {
                setJob(data);
                setLoading(false);
            }
        });

        const es = new EventSource(`${API_BASE}/stream`);

        es.onmessage = (e) => {
            if (!alive) return;
            try {
                const { type, data } = JSON.parse(e.data);
                if (type === "job_updated" && data?.job) {
                    setJob(data.job);
                    setLoading(false);
                }
            } catch {
                // ignore malformed frames
            }
        };

        return () => {
            alive = false;
            es.close();
        };
    }, []);

    return { job, loading };
}
