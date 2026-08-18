"use client";

import { useState } from "react";
import { t } from "@/infrastructure/i18n/translations";
import { ServiceProposalSummary } from "@/domain/messaging/types";
import { ProposalCard } from "@/components/messaging/ProposalCard";
import ServiceProposalDetailModal from "@/components/messaging/ServiceProposalDetailModal";
import { useRouter } from "next/navigation";

interface ScheduledJobsSectionProps {
  jobs: ServiceProposalSummary[];
}

export default function ScheduledJobsSection({ jobs }: ScheduledJobsSectionProps) {
  const [selectedJob, setSelectedJob] = useState<ServiceProposalSummary | null>(null);
  const router = useRouter();

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
            className="text-[26px] font-bold text-brand-primary"
          >
            {t.providerHome.scheduledJobsSection.title}
          </h2>
        </div>

        {jobs.length === 0 ? (
          <p className="text-[16px] text-slate-500 text-center py-8">{t.providerHome.scheduledJobsSection.emptyState}</p>
        ) : (
          <ul
            aria-label={t.providerHome.scheduledJobsSection.listLabel}
            className="flex flex-col gap-4"
          >
            {jobs.map((job) => (
              <li key={job.id}>
                <ProposalCard 
                  proposal={job} 
                  isProvider={true} 
                  onClick={() => setSelectedJob(job)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedJob && (
        <ServiceProposalDetailModal
          proposal={selectedJob}
          onClose={() => setSelectedJob(null)}
          onViewConversation={() => {
            const counterpartId = selectedJob.counterpart.id;
            setSelectedJob(null);
            router.push(`/prestador/mensajes?consumer_id=${counterpartId}`);
          }}
        />
      )}
    </>
  );
}