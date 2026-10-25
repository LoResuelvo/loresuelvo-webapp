import { AuthSession } from "@/infrastructure/auth/types";
import { ProviderWorkRequest } from "@/domain/provider/types";
import { ServiceProposalSummary } from "@/domain/messaging/types";
import { t } from "@/infrastructure/i18n/translations";
import PerformanceOverview from "./metrics/PerformanceOverview";
import ProviderHeader from "./layout/ProviderHeader";
import ProviderSidebar from "./layout/ProviderSidebar";
import ScheduledJobsSection from "./scheduled-jobs/ScheduledJobsSection";
import WorkRequestsSection from "./work-requests/WorkRequestsSection";

interface ProviderHomeProps {
  session: AuthSession | null;
  categoryName?: string;
  workRequests: ProviderWorkRequest[];
  scheduledJobs: ServiceProposalSummary[];
}

export default function ProviderHome({ session, categoryName, workRequests, scheduledJobs }: ProviderHomeProps) {
  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col md:flex-row font-sans text-brand-primary">
      <ProviderSidebar responsive />
      <div className="flex-1 flex flex-col min-w-0">
        <ProviderHeader session={session} categoryName={categoryName} />
        <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="border-b border-slate-200 pb-6">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-brand-primary">{t.providerHome.overview.title}</h1>
            <p className="mt-2 max-w-2xl text-body leading-relaxed text-slate-500">{t.providerHome.overview.description}</p>
          </div>
          <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
            <WorkRequestsSection requests={workRequests} />
            <ScheduledJobsSection jobs={scheduledJobs} />
          </div>
          <PerformanceOverview />
        </main>
      </div>
    </div>
  );
}
