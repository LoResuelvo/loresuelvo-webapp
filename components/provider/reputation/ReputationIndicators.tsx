import type { ProviderRatingDistribution, ProviderReputation } from "@/domain/provider/reputation";
import { t } from "@/infrastructure/i18n/translations";
import { reputationRating, reputationCoverage } from "./reputation-format";

function RatingDistributionList({
  distribution,
  reviewCount,
}: {
  distribution: readonly ProviderRatingDistribution[];
  reviewCount: number;
}) {
  const labels = t.providerReputation;
  const sorted = [...distribution].sort((a, b) => b.rating - a.rating);

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-5 min-w-0"
      data-testid="rating-distribution"
    >
      <h3 className="text-sm font-medium text-slate-600 mb-3">
        {labels.ratingDistribution}
      </h3>
      <ul className="space-y-2">
        {sorted.map(({ rating, count }) => {
          const percentage = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
          const starLabel = rating === 1 ? labels.star1 : (labels as Record<string, string>)[`star${rating}`] || `${rating} ${labels.stars}`;
          return (
            <li key={rating} className="flex items-center gap-3 text-sm">
              <span className="w-20 font-medium text-slate-700">{starLabel}</span>
              <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-8 text-right font-semibold text-slate-700">{count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CoverageSection({ data }: { data: ProviderReputation }) {
  const labels = t.providerReputation;

  return (
    <section
      aria-labelledby="reputation-coverage-title"
      data-testid="reputation-coverage"
      className="space-y-4"
    >
      <h2 id="reputation-coverage-title" className="text-xl font-semibold">
        {labels.coverage}
      </h2>
      <p className="text-sm text-slate-600">{labels.coverageHelp}</p>
      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 min-w-0">
          <dt className="text-sm font-medium text-slate-600">{labels.coveragePercentage}</dt>
          <dd className="mt-2 text-3xl font-bold text-brand-primary">
            {reputationCoverage(data.coveragePercentage)}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 min-w-0">
          <dt className="text-sm font-medium text-slate-600">{labels.reviewedPaidOrders}</dt>
          <dd className="mt-2 text-3xl font-bold text-brand-primary">
            {data.reviewedPaidOrders}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 min-w-0">
          <dt className="text-sm font-medium text-slate-600">{labels.eligiblePaidOrders}</dt>
          <dd className="mt-2 text-3xl font-bold text-brand-primary">
            {data.eligiblePaidOrders}
          </dd>
          <p className="mt-2 text-xs text-slate-500">{labels.denominatorExplanation}</p>
        </div>
      </dl>
    </section>
  );
}

export function ReputationIndicators({ data }: { data: ProviderReputation }) {
  const labels = t.providerReputation;

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="reputation-indicators-title"
        data-testid="reputation-indicators"
        className="space-y-4"
      >
        <h2 id="reputation-indicators-title" className="text-xl font-semibold">
          {labels.indicators}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 min-w-0 space-y-4">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-slate-600">{labels.averageRating}</dt>
                <dd className="mt-2 text-3xl font-bold text-brand-primary">
                  {reputationRating(data.averageRating)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-600">{labels.reviewCount}</dt>
                <dd className="mt-2 text-3xl font-bold text-brand-primary">
                  {data.reviewCount}
                </dd>
              </div>
            </dl>
          </div>
          <RatingDistributionList
            distribution={data.ratingDistribution}
            reviewCount={data.reviewCount}
          />
        </div>
      </section>

      <CoverageSection data={data} />
    </div>
  );
}
