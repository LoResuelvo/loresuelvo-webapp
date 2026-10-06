import { describe, expect, it } from "vitest";
import { mapProviderReputation } from "./reputation-mapper";

const validRaw = {
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
    { work_order_id: 101, rating: 5, description: "Excelente trabajo." },
  ],
  next_cursor: "cursor-token",
};

describe("mapProviderReputation", () => {
  it("maps valid reputation payload into domain model", () => {
    const result = mapProviderReputation(validRaw);
    expect(result.calculatedAt).toBe("2026-08-31T00:00:00-03:00");
    expect(result.averageRating).toBe(4.8);
    expect(result.reviewCount).toBe(5);
    expect(result.ratingDistribution).toEqual([
      { rating: 5, count: 4 },
      { rating: 4, count: 1 },
      { rating: 3, count: 0 },
      { rating: 2, count: 0 },
      { rating: 1, count: 0 },
    ]);
    expect(result.eligiblePaidOrders).toBe(6);
    expect(result.reviewedPaidOrders).toBe(5);
    expect(result.coveragePercentage).toBe(83.33);
    expect(result.reviews).toEqual([
      { workOrderId: 101, rating: 5, description: "Excelente trabajo." },
    ]);
    expect(result.nextCursor).toBe("cursor-token");
  });

  it("handles null average rating, null coverage percentage and null cursor", () => {
    const result = mapProviderReputation({
      ...validRaw,
      average_rating: null,
      coverage_percentage: null,
      next_cursor: null,
      reviews: [],
    });
    expect(result.averageRating).toBeNull();
    expect(result.coveragePercentage).toBeNull();
    expect(result.nextCursor).toBeNull();
    expect(result.reviews).toEqual([]);
  });

  it("throws on non-object input", () => {
    expect(() => mapProviderReputation(null)).toThrow("Invalid reputation object");
    expect(() => mapProviderReputation("string")).toThrow("Invalid reputation object");
  });

  it("throws on invalid calculated_at", () => {
    expect(() => mapProviderReputation({ ...validRaw, calculated_at: "not-a-date" })).toThrow("Invalid calculated_at instant");
  });

  it("throws on negative count", () => {
    expect(() => mapProviderReputation({ ...validRaw, review_count: -1 })).toThrow("Invalid reputation count");
  });

  it("throws on out-of-bounds average rating", () => {
    expect(() => mapProviderReputation({ ...validRaw, average_rating: 5.5 })).toThrow("Invalid average rating");
    expect(() => mapProviderReputation({ ...validRaw, average_rating: -0.1 })).toThrow("Invalid average rating");
  });

  it("throws on incomplete or invalid rating distribution", () => {
    expect(() => mapProviderReputation({
      ...validRaw,
      rating_distribution: [{ rating: 5, count: 1 }],
    })).toThrow("Rating distribution must include all ratings from 1 to 5");

    expect(() => mapProviderReputation({
      ...validRaw,
      rating_distribution: [
        { rating: 5, count: 1 },
        { rating: 5, count: 1 },
        { rating: 3, count: 0 },
        { rating: 2, count: 0 },
        { rating: 1, count: 0 },
      ],
    })).toThrow("Duplicate star rating in distribution");
  });
});
