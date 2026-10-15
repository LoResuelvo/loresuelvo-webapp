import type { ProviderReview } from "@/domain/provider/reputation";
import { Button } from "@/components/ui/button";
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
      className="rounded-xl border border-slate-200 bg-white p-4 min-w-0 space-y-3"
    >
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <span className="min-w-0 break-words text-sm font-medium text-slate-600">
          {labels.workOrder} #{review.workOrderId}
        </span>
        <div role="img" className="flex shrink-0 items-center gap-2" aria-label={ratingAria}>
          <RatingStars rating={review.rating} />
          <span className="text-sm font-semibold text-slate-800">
            {review.rating}
          </span>
        </div>
      </header>

      {hasDescription && (
        <p
          data-testid="review-description"
          className="break-words text-sm text-slate-700 leading-relaxed"
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
      className="space-y-3"
    >
      <h2 id="reputation-reviews-title" className="text-xl font-semibold">
        {labels.reviewsTitle}
      </h2>

      {reviews.length === 0 ? (
        <p className="text-sm text-slate-600">{labels.noReviews}</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.workOrderId} review={review} />
          ))}
        </div>
      )}

      {hasNextPage && (
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={onNextPage}
            disabled={isLoadingNextPage}
            variant="brand"
            size="lg"
          >
            {labels.nextPage}
          </Button>
        </div>
      )}
    </section>
  );
}
