import { describe, expect, it } from "vitest";
import { reputationRating, reputationCoverage } from "./reputation-format";
import { t } from "@/infrastructure/i18n/translations";

describe("reputation-format", () => {
  it("formats valid rating with 1 decimal place", () => {
    expect(reputationRating(4.8)).toBe("4,8");
    expect(reputationRating(5)).toBe("5,0");
    expect(reputationRating(0)).toBe("0,0");
  });

  it("formats null rating as unavailable", () => {
    expect(reputationRating(null)).toBe(t.providerReputation.unavailable);
  });

  it("formats valid coverage percentage", () => {
    expect(reputationCoverage(83.33)).toBe("83,33 %");
    expect(reputationCoverage(100)).toBe("100 %");
    expect(reputationCoverage(0)).toBe("0 %");
  });

  it("formats null coverage as unavailable", () => {
    expect(reputationCoverage(null)).toBe(t.providerReputation.unavailable);
  });
});
