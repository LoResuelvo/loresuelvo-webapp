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
