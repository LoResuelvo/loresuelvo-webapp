"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { useState } from "react";
import { t } from "@/infrastructure/i18n/translations";
import { ServiceProposalSummary } from "@/domain/messaging/types";
import { ProposalCard } from "@/components/messaging/proposals/ProposalCard";
import ServiceProposalDetailModal from "@/components/messaging/proposals/ServiceProposalDetailModal";
import { useRouter } from "next/navigation";
import { getServiceProposalsAction } from "@/app/prestador/mensajes/actions";
import { Button } from "@/components/ui/button";
import { useRealtimeProposalList } from "@/components/messaging/proposals/useRealtimeProposalList";

interface ScheduledJobsSectionProps {
  jobs: ServiceProposalSummary[];
}

async function getScheduledJobs(): Promise<ServiceProposalSummary[]> {
  const proposals = await getServiceProposalsAction();
  return proposals.filter((proposal) => proposal.status === "accepted");
}

export default function ScheduledJobsSection({ jobs }: ScheduledJobsSectionProps) {
  const { items: scheduledJobs, refreshError, retry } = useRealtimeProposalList(
    jobs,
    getScheduledJobs
  );
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const router = useRouter();

  const selectedJob = scheduledJobs.find((job) => job.id === selectedJobId) ?? null;

  return (
    <>
      <section
        role="region"
        aria-labelledby="scheduled-jobs-title"
        aria-label={t.providerHome.scheduledJobsSection.ariaLabel}
        className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
      >
        <div className="mb-5 border-b border-slate-100 pb-5">
          <h2
            id="scheduled-jobs-title"
            className="font-heading text-xl font-semibold text-brand-primary"
          >
            {t.providerHome.scheduledJobsSection.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{t.providerHome.overview.jobsDescription}</p>
          <Link href={ROUTES.provider.jobs} className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-brand-secondary underline-offset-4 hover:underline">{t.providerHome.overview.viewJobs}</Link>
        </div>

        {refreshError && (
          <div
            role="alert"
            aria-live="assertive"
            data-testid="scheduled-jobs-refresh-error"
            className="flex items-center justify-between gap-3 p-3 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-caption"
          >
            <span>{t.notifications.refreshError.message}</span>
            <Button size="sm" variant="brand" onClick={retry}>
              {t.notifications.refreshError.retry}
            </Button>
          </div>
        )}

        {scheduledJobs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm leading-relaxed text-slate-500">{t.providerHome.scheduledJobsSection.emptyState}</p>
        ) : (
          <ul
            aria-label={t.providerHome.scheduledJobsSection.listLabel}
            className="flex flex-col gap-4"
          >
            {scheduledJobs.map((job) => (
              <li key={job.id}>
                <ProposalCard 
                  proposal={job} 
                  isProvider={true} 
                  onClick={() => setSelectedJobId(job.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedJob && (
        <ServiceProposalDetailModal
          proposal={selectedJob}
          onClose={() => setSelectedJobId(null)}
          onViewConversation={() => {
            const counterpartId = selectedJob.counterpart.id;
            setSelectedJobId(null);
            router.push(`/prestador/mensajes?consumer_id=${counterpartId}`);
          }}
        />
      )}
    </>
  );
}
