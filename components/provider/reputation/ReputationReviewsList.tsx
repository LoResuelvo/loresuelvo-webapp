import type { ProviderReview } from "@/domain/provider/reputation";
import { RatingStars } from "@/components/ui/rating-stars";
import { t } from "@/infrastructure/i18n/translations";

interface ReputationReviewsListProps {
  readonly reviews: readonly ProviderReview[];
  readonly hasNextPage?: boolean;
  readonly onNextPage?: () => void;
  readonly isLoadingNextPage?: boolean;
}

function ReviewCard({ review }: { review: ProviderReview }) {
  const labels = t.providerReputation;
  const ratingAria = `${review.rating} ${
    review.rating === 1 ? labels.star : labels.stars
  }`;
  const hasDescription = review.description.trim().length > 0;

  return (
    <article
      data-testid="review-card"
      data-work-order-id={review.workOrderId}
      className="rounded-xl border border-slate-200 bg-white p-5 min-w-0 space-y-3"
    >
      <header className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-slate-600">
          {labels.workOrder} #{review.workOrderId}
        </span>
        <div className="flex items-center gap-2" aria-label={ratingAria}>
          <RatingStars rating={review.rating} />
          <span className="text-sm font-semibold text-slate-800">
            {review.rating}
          </span>
        </div>
      </header>

      {hasDescription && (
        <p
          data-testid="review-description"
          className="text-sm text-slate-700 leading-relaxed"
        >
          {review.description}
        </p>
      )}
    </article>
  );
}

export function ReputationReviewsList({
  reviews,
  hasNextPage = false,
  onNextPage,
  isLoadingNextPage = false,
}: ReputationReviewsListProps) {
  const labels = t.providerReputation;

  return (
    <section
      aria-labelledby="reputation-reviews-title"
      data-testid="reputation-reviews"
      className="space-y-4"
    >
      <h2 id="reputation-reviews-title" className="text-xl font-semibold">
        {labels.reviewsTitle}
      </h2>

      {reviews.length === 0 ? (
        <p className="text-sm text-slate-600">{labels.emptyReviews}</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.workOrderId} review={review} />
          ))}
        </div>
      )}

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onNextPage}
            disabled={isLoadingNextPage}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-50"
          >
            {labels.nextPage}
          </button>
        </div>
      )}
    </section>
  );
}
