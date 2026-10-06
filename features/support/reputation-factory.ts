import type { ApiProviderReputation } from "../../infrastructure/api/types";

export function aReputationResponse(overrides?: Partial<ApiProviderReputation>): ApiProviderReputation {
  return {
    calculated_at: "2026-08-31T00:00:00-03:00",
    average_rating: 4.8,
    review_count: 5,
    rating_distribution: [
      { rating: 5, count: 4 },
      { rating: 4, count: 1 },
      { rating: 3, count: 0 },
      { rating: 2, count: 0 },
      { rating: 1, count: 0 },
    ],
    eligible_paid_orders: 6,
    reviewed_paid_orders: 5,
    coverage_percentage: 83.33,
    reviews: [
      { work_order_id: 101, rating: 5, description: "Excelente trabajo y puntualidad." },
      { work_order_id: 102, rating: 5, description: "Muy profesional, super recomendado." },
      { work_order_id: 103, rating: 5, description: "Rápido y prolijo." },
      { work_order_id: 104, rating: 5, description: "Todo perfecto." },
      { work_order_id: 105, rating: 4, description: "Buen servicio." },
    ],
    next_cursor: null,
    ...overrides,
  };
}

export function aReputationWithEmptyReview(overrides?: Partial<ApiProviderReputation>): ApiProviderReputation {
  return aReputationResponse({
    reviews: [
      { work_order_id: 101, rating: 5, description: "" },
      { work_order_id: 102, rating: 5, description: "Muy profesional, super recomendado." },
      { work_order_id: 103, rating: 5, description: "Rápido y prolijo." },
      { work_order_id: 104, rating: 5, description: "Todo perfecto." },
      { work_order_id: 105, rating: 4, description: "Buen servicio." },
    ],
    ...overrides,
  });
}

export function aPaginatedReputationFirstPage(overrides?: Partial<ApiProviderReputation>): ApiProviderReputation {
  return aReputationResponse({
    reviews: [
      { work_order_id: 110, rating: 5, description: "Trabajo 110" },
      { work_order_id: 109, rating: 5, description: "Trabajo 109" },
    ],
    next_cursor: "page-2",
    ...overrides,
  });
}

export function aPaginatedReputationSecondPage(overrides?: Partial<ApiProviderReputation>): ApiProviderReputation {
  return aReputationResponse({
    average_rating: 4.8,
    review_count: 5,
    reviews: [
      { work_order_id: 108, rating: 4, description: "Trabajo 108" },
      { work_order_id: 107, rating: 4, description: "Trabajo 107" },
    ],
    next_cursor: null,
    ...overrides,
  });
}

export function aReputationWithoutNextCursor(overrides?: Partial<ApiProviderReputation>): ApiProviderReputation {
  return aReputationResponse({
    next_cursor: null,
    ...overrides,
  });
}

export function anEmptyReputationResponse(
  eligiblePaidOrders = 0,
  overrides?: Partial<ApiProviderReputation>
): ApiProviderReputation {
  return {
    calculated_at: "2026-08-31T00:00:00-03:00",
    average_rating: null,
    review_count: 0,
    rating_distribution: [
      { rating: 5, count: 0 },
      { rating: 4, count: 0 },
      { rating: 3, count: 0 },
      { rating: 2, count: 0 },
      { rating: 1, count: 0 },
    ],
    eligible_paid_orders: eligiblePaidOrders,
    reviewed_paid_orders: 0,
    coverage_percentage: eligiblePaidOrders > 0 ? 0 : null,
    reviews: [],
    next_cursor: null,
    ...overrides,
  };
}
