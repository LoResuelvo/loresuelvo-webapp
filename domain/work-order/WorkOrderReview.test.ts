import { describe, expect, it } from "vitest";
import {
  WorkOrderReviewModule,
  isValidRating,
  isValidDescription,
  validateReviewInput,
  createReview,
} from "./WorkOrderReview";

describe("WorkOrderReview Domain Module", () => {
  describe("isValidRating", () => {
    it("returns true for integers between 1 and 5", () => {
      expect(isValidRating(1)).toBe(true);
      expect(isValidRating(3)).toBe(true);
      expect(isValidRating(5)).toBe(true);
    });

    it("returns false for values outside 1-5 or non-integers", () => {
      expect(isValidRating(0)).toBe(false);
      expect(isValidRating(6)).toBe(false);
      expect(isValidRating(-1)).toBe(false);
      expect(isValidRating(4.5)).toBe(false);
      expect(isValidRating("5" as unknown as number)).toBe(false);
      expect(isValidRating(null as unknown as number)).toBe(false);
      expect(isValidRating(undefined as unknown as number)).toBe(false);
    });
  });

  describe("isValidDescription", () => {
    it("returns true for empty, undefined or short descriptions", () => {
      expect(isValidDescription(undefined)).toBe(true);
      expect(isValidDescription("")).toBe(true);
      expect(isValidDescription("Excelente servicio")).toBe(true);
    });

    it("returns true for description with exactly 500 characters", () => {
      const description500 = "a".repeat(500);
      expect(isValidDescription(description500)).toBe(true);
    });

    it("returns false for description exceeding 500 characters", () => {
      const description501 = "a".repeat(501);
      expect(isValidDescription(description501)).toBe(false);
    });

    it("returns false for non-string values", () => {
      expect(isValidDescription(123 as unknown as string)).toBe(false);
    });
  });

  describe("validateReviewInput", () => {
    it("validates valid input with rating and comment", () => {
      const result = validateReviewInput({
        rating: 5,
        comment: "Muy puntual",
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("validates valid input with rating only", () => {
      const result = validateReviewInput({
        rating: 4,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns errors when rating is invalid", () => {
      const result = validateReviewInput({
        rating: 0,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Rating must be an integer between 1 and 5");
    });

    it("returns errors when description exceeds 500 characters", () => {
      const result = validateReviewInput({
        rating: 5,
        description: "a".repeat(501),
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Description cannot exceed 500 characters");
    });
  });

  describe("createReview", () => {
    it("creates an immutable review object with trimmed description", () => {
      const review = createReview({
        rating: 5,
        comment: "  Excelente atención  ",
      });

      expect(review).toEqual({
        rating: 5,
        comment: "Excelente atención",
        description: "Excelente atención",
      });
      expect(Object.isFrozen(review)).toBe(true);
    });

    it("creates a review with undefined comment when empty", () => {
      const review = createReview({
        rating: 4,
        comment: "   ",
      });

      expect(review).toEqual({
        rating: 4,
        comment: undefined,
        description: undefined,
      });
    });

    it("throws an error when input is invalid", () => {
      expect(() =>
        createReview({
          rating: 6,
        })
      ).toThrow("Rating must be an integer between 1 and 5");
    });
  });
});
