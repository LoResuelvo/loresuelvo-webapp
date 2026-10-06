export interface ProviderRatingDistribution {
  readonly rating: number;
  readonly count: number;
}

export interface ProviderReview {
  readonly workOrderId: number;
  readonly rating: number;
  readonly description: string;
}

export interface ProviderReputation {
  readonly calculatedAt: string;
  readonly averageRating: number | null;
  readonly reviewCount: number;
  readonly ratingDistribution: readonly ProviderRatingDistribution[];
  readonly eligiblePaidOrders: number;
  readonly reviewedPaidOrders: number;
  readonly coveragePercentage: number | null;
  readonly reviews: readonly ProviderReview[];
  readonly nextCursor: string | null;
}
