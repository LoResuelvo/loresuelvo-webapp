import { describe, expect, it } from "vitest";
import { ProviderModule } from "./Provider";
import type { Provider } from "./types";

describe("Provider Domain Module", () => {
  const sampleProvider: Provider = {
    id: 1,
    name: "Carlos",
    surname: "Gómez",
    categoryName: "Electricista",
    rating: 4.8,
    reviews: 12,
    jobs: 30,
  };

  describe("getDisplayName", () => {
    it("returns full name formatted with trim", () => {
      expect(ProviderModule.getDisplayName(sampleProvider)).toBe("Carlos Gómez");
      expect(ProviderModule.getDisplayName({ name: " María ", surname: " López " })).toBe("María López");
    });
  });

  describe("getInitials", () => {
    it("returns uppercase initials from name and surname", () => {
      expect(ProviderModule.getInitials(sampleProvider)).toBe("CG");
      expect(ProviderModule.getInitials({ name: "ana", surname: "perez" })).toBe("AP");
    });

    it("handles single name or fallback", () => {
      expect(ProviderModule.getInitials({ name: "Carlos", surname: "" })).toBe("C");
      expect(ProviderModule.getInitials({ name: "", surname: "" })).toBe("P");
    });
  });

  describe("getRatingSummary", () => {
    it("returns formatted rating and review counts", () => {
      const summary = ProviderModule.getRatingSummary(sampleProvider);
      expect(summary.hasReviews).toBe(true);
      expect(summary.formattedRating).toBe("4.8");
      expect(summary.reviewsCount).toBe(12);
    });

    it("handles provider with no rating or reviews", () => {
      const unrated: Provider = {
        id: 2,
        name: "Lucía",
        surname: "Vázquez",
        categoryName: "Plomera",
      };
      const summary = ProviderModule.getRatingSummary(unrated);
      expect(summary.hasReviews).toBe(false);
      expect(summary.formattedRating).toBe("0.0");
      expect(summary.reviewsCount).toBe(0);
    });
  });
});
