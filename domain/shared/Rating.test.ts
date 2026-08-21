import { describe, expect, it } from "vitest";
import { Rating } from "./Rating";

describe("Rating Value Object", () => {
  describe("create", () => {
    it("creates a valid Rating instance within range 1 to 5", () => {
      const r = Rating.create(4.5);
      expect(r.value).toBe(4.5);
    });

    it("allows boundary values 1 and 5", () => {
      expect(Rating.create(1).value).toBe(1);
      expect(Rating.create(5).value).toBe(5);
    });

    it("throws error for rating less than 1", () => {
      expect(() => Rating.create(0.9)).toThrow("Rating must be between 1 and 5");
    });

    it("throws error for rating greater than 5", () => {
      expect(() => Rating.create(5.1)).toThrow("Rating must be between 1 and 5");
    });

    it("throws error for NaN or non-finite numbers", () => {
      expect(() => Rating.create(NaN)).toThrow("Rating must be a finite number");
    });
  });

  describe("formatting & stars", () => {
    it("formats to 1 decimal place string", () => {
      expect(Rating.format(Rating.create(4.8))).toBe("4.8");
      expect(Rating.format(Rating.create(5))).toBe("5.0");
    });

    it("calculates star breakdown correctly", () => {
      const breakdown = Rating.getStarBreakdown(Rating.create(4.5));
      expect(breakdown).toEqual({
        fullStars: 4,
        hasHalfStar: true,
        emptyStars: 0,
      });

      const breakdown2 = Rating.getStarBreakdown(Rating.create(3.2));
      expect(breakdown2).toEqual({
        fullStars: 3,
        hasHalfStar: false,
        emptyStars: 2,
      });
    });
  });
});
