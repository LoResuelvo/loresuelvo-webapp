import type { ProviderRatingDistribution, ProviderReputation, ProviderReview } from "@/domain/provider/reputation";

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Invalid reputation object");
  }
  return value as Record<string, unknown>;
}

function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("Invalid reputation count");
  }
  return value;
}

function instant(value: unknown): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error("Invalid calculated_at instant");
  }
  return value;
}

function averageRating(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 5) {
    throw new Error("Invalid average rating");
  }
  return value;
}

function coveragePercentage(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error("Invalid coverage percentage");
  }
  return value;
}

function ratingDistribution(value: unknown): ProviderRatingDistribution[] {
  if (!Array.isArray(value)) throw new Error("Invalid rating distribution");
  const ratingsSeen = new Set<number>();
  const result: ProviderRatingDistribution[] = [];
  for (const item of value) {
    const rec = record(item);
    const r = rec.rating;
    if (typeof r !== "number" || !Number.isSafeInteger(r) || r < 1 || r > 5) {
      throw new Error("Invalid star rating");
    }
    if (ratingsSeen.has(r)) {
      throw new Error("Duplicate star rating in distribution");
    }
    ratingsSeen.add(r);
    result.push({ rating: r, count: count(rec.count) });
  }
  if (ratingsSeen.size !== 5) {
    throw new Error("Rating distribution must include all ratings from 1 to 5");
  }
  return result.sort((a, b) => b.rating - a.rating);
}

function reviews(value: unknown): ProviderReview[] {
  if (!Array.isArray(value)) throw new Error("Invalid reviews array");
  return value.map(item => {
    const rec = record(item);
    const workOrderId = rec.work_order_id;
    if (typeof workOrderId !== "number" || !Number.isSafeInteger(workOrderId) || workOrderId <= 0) {
      throw new Error("Invalid work order ID");
    }
    const r = rec.rating;
    if (typeof r !== "number" || !Number.isSafeInteger(r) || r < 1 || r > 5) {
      throw new Error("Invalid review rating");
    }
    const description = rec.description;
    if (typeof description !== "string") {
      throw new Error("Invalid review description");
    }
    return {
      workOrderId,
      rating: r,
      description,
    };
  });
}

function nextCursor(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error("Invalid next cursor");
  return value;
}

export function mapProviderReputation(raw: unknown): ProviderReputation {
  const source = record(raw);
  return {
    calculatedAt: instant(source.calculated_at),
    averageRating: averageRating(source.average_rating),
    reviewCount: count(source.review_count),
    ratingDistribution: ratingDistribution(source.rating_distribution),
    eligiblePaidOrders: count(source.eligible_paid_orders),
    reviewedPaidOrders: count(source.reviewed_paid_orders),
    coveragePercentage: coveragePercentage(source.coverage_percentage),
    reviews: reviews(source.reviews),
    nextCursor: nextCursor(source.next_cursor),
  };
}
