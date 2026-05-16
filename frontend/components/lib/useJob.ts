"use client";

import { useEffect, useState } from "react";
import type { ShadowJob } from "../types/shadow-mlo";
import { API_BASE, getJob } from "./api";

export function useJob(jobId: string | null) {
    const [job, setJob] = useState<ShadowJob | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!jobId) {
            return;
        }

        let alive = true;

        getJob(jobId).then((data) => {
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
                if (type === "job_updated" && data?.job?.id === jobId) {
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
    }, [jobId]);

    const visibleJob = job?.id === jobId ? job : null;

    return { job: visibleJob, loading: Boolean(jobId) && loading };
}
