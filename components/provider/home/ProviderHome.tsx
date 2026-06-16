import { AuthSession } from "@/infrastructure/auth/types";
import { ProviderMetrics, ProviderScheduledJob, ProviderWorkRequest } from "@/domain/provider/types";
import IncomePanel from "./IncomePanel";
import ProviderHeader from "./ProviderHeader";
import ProviderSidebar from "./ProviderSidebar";
import ScheduledJobsSection from "./ScheduledJobsSection";
import WorkRequestsSection from "./WorkRequestsSection";

interface ProviderHomeProps {
  session: AuthSession | null;
  workRequests: ProviderWorkRequest[];
  scheduledJobs: ProviderScheduledJob[];
  metrics: ProviderMetrics;
}

export default function ProviderHome({ session, workRequests, scheduledJobs, metrics }: ProviderHomeProps) {
  return (
    <div className="min-h-screen bg-brand-neutral/30 flex font-sans text-brand-primary">
      <ProviderSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ProviderHeader session={session} />
        <main className="flex-1 p-8 lg:p-10">
          <div className="flex gap-8">
            <div className="flex-1 space-y-10">
              <WorkRequestsSection requests={workRequests} />
              <ScheduledJobsSection jobs={scheduledJobs} />
            </div>
            <IncomePanel metrics={metrics} />
          </div>
        </main>
      </div>
    </div>
  );
}
