import { Calendar, MapPin, User } from "lucide-react";
import { ProviderScheduledJob } from "@/domain/provider/types";
import { t } from "@/infrastructure/i18n/translations";

interface ScheduledJobsSectionProps {
  jobs: ProviderScheduledJob[];
}

export default function ScheduledJobsSection({ jobs }: ScheduledJobsSectionProps) {
  return (
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
            <li
              key={job.id}
              className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm"
            >
              <article className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <h3
                    data-field="job-title"
                    className="text-[18px] font-bold text-brand-primary"
                  >
                    {job.jobTitle}
                  </h3>

                  <div className="flex items-center gap-2 text-[14px] text-slate-600">
                    <User className="h-4 w-4 text-brand-secondary" aria-hidden="true" />
                    <span data-field="client-name">{job.clientName}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[14px] text-slate-600">
                    <Calendar className="h-4 w-4 text-brand-secondary" aria-hidden="true" />
                    <span data-field="scheduled-at">{job.scheduledAtLabel}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[14px] text-slate-600">
                    <MapPin className="h-4 w-4 text-brand-secondary" aria-hidden="true" />
                    <span data-field="location">{job.location}</span>
                  </div>

                  <p
                    data-field="price"
                    className="text-[16px] font-semibold text-brand-primary mt-1"
                  >
                    {job.priceLabel}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}