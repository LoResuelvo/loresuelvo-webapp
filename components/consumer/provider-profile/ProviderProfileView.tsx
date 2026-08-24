import { ProviderModule } from "@/domain/provider/Provider";
import type { Provider } from "@/domain/provider/types";
import { ScheduledDateTime } from "@/domain/shared/ScheduledDateTime";
import type { AuthSession } from "@/infrastructure/auth/types";
import { t } from "@/infrastructure/i18n/translations";
import { Avatar } from "@/components/ui/avatar";
import { RatingStars } from "@/components/ui/rating-stars";
import Sidebar from "@/components/consumer/Sidebar";
import ConsumerHeader from "@/components/consumer/home/ConsumerHeader";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

interface ProviderProfileViewProps {
  provider: Provider;
  session: AuthSession | null;
}

interface PublicWorkOrderView {
  id: number;
  scheduledOn: { isoString: string };
  description: string;
  completionReport: {
    description: string;
    reportedOn: { isoString: string };
  };
  review?: {
    rating: number;
    description: string;
  };
}

function WorkOrderArticle({ workOrder }: { workOrder: PublicWorkOrderView }) {
  return (
    <li className="min-w-0">
      <article className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="break-words text-subtitle font-bold text-brand-primary">
          {workOrder.description}
        </h3>
        <p className="mt-2 break-words text-small text-slate-600">
          {ScheduledDateTime.formatDateOnly(workOrder.scheduledOn)}
        </p>

        <section className="mt-5 min-w-0" aria-labelledby={`completion-report-${workOrder.id}`}>
          <h4 id={`completion-report-${workOrder.id}`} className="text-small font-bold text-brand-primary">
            {t.consumerSearch.profile.completionReportLabel}
          </h4>
          <p className="mt-2 min-w-0 break-words whitespace-pre-wrap text-body text-slate-700">
            {workOrder.completionReport.description}
          </p>
          <p className="mt-2 break-words text-small text-slate-600">
            {t.consumerSearch.profile.reportedOnLabel} {ScheduledDateTime.formatDateOnly(workOrder.completionReport.reportedOn)}
          </p>
        </section>

        <section className="mt-5 min-w-0" aria-labelledby={`review-${workOrder.id}`}>
          <h4 id={`review-${workOrder.id}`} className="text-small font-bold text-brand-primary">
            {t.consumerSearch.profile.reviewLabel}
          </h4>
          {workOrder.review ? (
            <div className="mt-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <RatingStars rating={workOrder.review.rating} />
                <span className="text-small font-semibold text-slate-700">
                  {t.consumerSearch.profile.reviewRatingLabel}: {workOrder.review.rating.toFixed(1)}
                </span>
              </div>
              <p className="mt-2 min-w-0 break-words whitespace-pre-wrap text-body text-slate-700">
                {workOrder.review.description}
              </p>
            </div>
          ) : null}
        </section>
      </article>
    </li>
  );
}

export default function ProviderProfileView({ provider, session }: ProviderProfileViewProps) {
  const displayName = ProviderModule.getDisplayName(provider);
  const rating = typeof provider.rating === "number" ? provider.rating : 0;
  const reviews = typeof provider.reviews === "number" ? provider.reviews : 0;
  const workOrders = (provider as Provider & { workOrders?: PublicWorkOrderView[] }).workOrders ?? [];

  return (
    <div className="min-h-screen bg-brand-neutral/30 flex font-sans text-brand-primary">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <ConsumerHeader session={session} />

        <main className="flex-1 p-4 sm:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-4xl">
            <Link
              href={ROUTES.consumer.home}
              className="mb-6 inline-flex rounded-lg px-1 py-2 text-body font-semibold text-brand-secondary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary"
            >
              ← {t.consumerSearch.header.backTitle}
            </Link>

            <section
              aria-labelledby="provider-profile-title"
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10"
            >
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                <Avatar
                  src={provider.profilePhotoUrl}
                  alt={`${t.consumerSearch.profile.photoAlt} ${displayName}`}
                  size="xl"
                  initials={ProviderModule.getInitials(provider)}
                  imgTestId="provider-profile-photo"
                />

                <div className="min-w-0 text-center sm:text-left">
                  <p className="text-small font-semibold uppercase tracking-wide text-brand-secondary">
                    {t.consumerSearch.profile.title}
                  </p>
                  <h1 id="provider-profile-title" className="mt-1 break-words text-title font-bold text-brand-primary">
                    {displayName}
                  </h1>
                  <p className="mt-3 text-body text-slate-500">
                    <span className="font-semibold text-slate-700">
                      {t.consumerSearch.profile.categoryLabel}:
                    </span>{" "}
                    {provider.categoryName}
                  </p>
                </div>
              </div>
            </section>

            <section
              aria-labelledby="provider-rating-title"
              className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <h2 id="provider-rating-title" className="text-subtitle font-bold text-brand-primary">
                {t.consumerSearch.profile.ratingLabel}
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <RatingStars rating={rating} />
                <span className="text-title font-bold text-brand-primary">
                  {rating.toFixed(1)}
                </span>
                <span className="text-body text-slate-600">
                  ({reviews} {t.consumerSearch.profile.reviewsLabel})
                </span>
              </div>
            </section>

            <section
              aria-labelledby="provider-work-history-title"
              className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <h2 id="provider-work-history-title" className="text-subtitle font-bold text-brand-primary">
                {t.consumerSearch.profile.historyTitle}
              </h2>
              <ul className="mt-5 grid min-w-0 gap-4" role="list">
                {workOrders.map((workOrder) => (
                  <WorkOrderArticle key={workOrder.id} workOrder={workOrder} />
                ))}
              </ul>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
