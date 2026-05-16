"use client";

import { useEffect, useState } from "react";
import type { ShadowJob } from "../types/shadow-mlo";
import { getAllJobs, API_BASE } from "./api";

export function useJobs() {
    const [jobs, setJobs] = useState<ShadowJob[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;

        getAllJobs().then((data) => {
            if (alive) {
                setJobs(data);
                setLoading(false);
            }
        });

        const es = new EventSource(`${API_BASE}/stream`);

        es.onmessage = (e) => {
            if (!alive) return;
            try {
                const { type, data } = JSON.parse(e.data);
                if (type === "job_updated" && data?.job) {
                    setJobs((prev) => {
                        const idx = prev.findIndex((j) => j.id === data.job.id);
                        if (idx === -1) return [data.job, ...prev];
                        const next = [...prev];
                        next[idx] = data.job;
                        return next;
                    });
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

    return { jobs, loading };
}
