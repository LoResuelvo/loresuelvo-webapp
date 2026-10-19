"use client";

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
        className="max-w-4xl"
      >
        <div className="mb-5">
          <h2
            id="scheduled-jobs-title"
            className="text-title font-bold text-brand-primary"
          >
            {t.providerHome.scheduledJobsSection.title}
          </h2>
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
          <p className="text-body-lg text-slate-500 text-center py-8">{t.providerHome.scheduledJobsSection.emptyState}</p>
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
