"use client";

import { AppShell } from "@/components/layout/AppShell";
import { SystemStatusCards } from "@/components/dashboard/SystemStatusCards";
import { LiveRunHeader } from "@/components/dashboard/LiveRunHeader";
import { ArtifactClassificationCard } from "@/components/dashboard/ArtifactClassificationCard";
import { DeviceProfileCard } from "@/components/dashboard/DeviceProfileCard";
import { AgentPlanCard } from "@/components/dashboard/AgentPlanCard";
import { ExecutionTimeline } from "@/components/dashboard/ExecutionTimeline";
import { CandidateResultsTable } from "@/components/dashboard/CandidateResultsTable";
import { RecommendationCard } from "@/components/dashboard/RecommendationCard";
import { ActivityLog } from "@/components/dashboard/ActivityLog";
import { useLatestJob } from "@/components/lib/useLatestJob";

export default function HomePage() {
  const { job, loading } = useLatestJob();

  return (
    <AppShell>
      {loading ? (
        <div className="flex h-64 items-center justify-center text-zinc-500 text-sm">
          Connecting to backend…
        </div>
      ) : !job ? (
        <div className="flex h-64 items-center justify-center text-zinc-500 text-sm">
          No jobs yet. Drop an .onnx, .pt, or .gguf file into <span className="mx-1 font-mono text-zinc-300">models/</span> to start.
        </div>
      ) : (
        <div className="space-y-3">
          <LiveRunHeader job={job} />
          <SystemStatusCards job={job} />
          <RecommendationCard job={job} />
          <ExecutionTimeline steps={job.timeline} />
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr]">
            <CandidateResultsTable candidates={job.candidates} />
            <ActivityLog events={(job.events ?? []).slice(-3).reverse()} />
          </div>
          <div className="grid grid-cols-1 gap-2 xl:grid-cols-[1.1fr_0.8fr_1.1fr]">
            <AgentPlanCard plan={job.plan} />
            <ArtifactClassificationCard classification={job.classification} />
            <DeviceProfileCard deviceProfile={job.deviceProfile} />
          </div>
        </div>
      )}
    </AppShell>
  );
}
