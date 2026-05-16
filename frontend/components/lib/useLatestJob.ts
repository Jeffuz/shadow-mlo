"use client";

import { useEffect, useState } from "react";
import type { ShadowJob } from "../types/shadow-mlo";
import { getLatestJob } from "./api";
import { mockJob } from "../mock/mockJob";

export function useLatestJob() {
    const [job, setJob] = useState<ShadowJob>(mockJob);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;

        async function load() {
            const data = await getLatestJob();
            if (alive) {
                setJob(data);
                setLoading(false);
            }
        }

        load();
        const id = window.setInterval(load, 1000);

        return () => {
            alive = false;
            window.clearInterval(id);
        };
    }, []);

    return { job, loading };
}