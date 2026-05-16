import { mockJob } from "@/components/mock/mockJob";
import { AppShell } from "@/components/layout/AppShell";
import { SystemStatusCards } from "@/components/dashboard/SystemStatusCards";
import { LiveRunHeader } from "@/components/dashboard/LiveRunHeader";
import { ArtifactClassificationCard } from "@/components/dashboard/ArtifactClassificationCard";
import { DeviceProfileCard } from "@/components/dashboard/DeviceProfileCard";
import { RuntimeRouteCard } from "@/components/dashboard/RuntimeRouteCard";
import { AgentPlanCard } from "@/components/dashboard/AgentPlanCard";
import { ExecutionTimeline } from "@/components/dashboard/ExecutionTimeline";
import { CandidateResultsTable } from "@/components/dashboard/CandidateResultsTable";
import { RecommendationCard } from "@/components/dashboard/RecommendationCard";
import { ActivityLog } from "@/components/dashboard/ActivityLog";

export default function HomePage() {
  const job = mockJob;

  return (
    <AppShell>
      <div className="space-y-6">
        <LiveRunHeader job={job} />

        <SystemStatusCards job={job} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <ExecutionTimeline steps={job.timeline} />
            <CandidateResultsTable candidates={job.candidates} />
          </div>

          <div className="space-y-6">
            <RecommendationCard recommendation={job.recommendation} />
            <ArtifactClassificationCard classification={job.classification} />
            <DeviceProfileCard deviceProfile={job.deviceProfile} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <AgentPlanCard plan={job.plan} />
          <RuntimeRouteCard job={job} />
        </div>

        <ActivityLog events={job.events ?? []} />
      </div>
    </AppShell>
  );
}