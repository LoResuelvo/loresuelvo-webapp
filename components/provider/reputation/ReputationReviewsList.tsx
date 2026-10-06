import type { ProviderReview } from "@/domain/provider/reputation";
import { RatingStars } from "@/components/ui/rating-stars";
import { t } from "@/infrastructure/i18n/translations";

interface ReputationReviewsListProps {
  readonly reviews: readonly ProviderReview[];
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

export function ReputationReviewsList({ reviews }: ReputationReviewsListProps) {
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
    </section>
  );
}
