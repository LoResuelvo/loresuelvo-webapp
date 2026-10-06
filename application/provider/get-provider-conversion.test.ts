import { describe, expect, it, vi } from "vitest";
import { getProviderConversion } from "./get-provider-conversion";
import type { ProviderConversionRepository } from "@/ports/provider/provider-conversion-repository";
import type { ProviderConversion } from "@/domain/provider/conversion";

const mockConversion: ProviderConversion = {
  period: {
    from: "2026-08-01T00:00:00-03:00",
    to: "2026-08-31T00:00:00-03:00",
    timeZone: "America/Argentina/Buenos_Aires",
  },
  observedAt: "2026-09-15T10:30:00-03:00",
  proposals: {
    stages: { issued: 10, contracted: 6, reported: 4, paid: 2 },
    rates: {
      contracted: {
        cohort: { numerator: 6, denominator: 10, percentage: 60 },
        previousStage: { numerator: 6, denominator: 10, percentage: 60 },
      },
      reported: {
        cohort: { numerator: 4, denominator: 10, percentage: 40 },
        previousStage: { numerator: 4, denominator: 6, percentage: 66.67 },
      },
      paid: {
        cohort: { numerator: 2, denominator: 10, percentage: 20 },
        previousStage: { numerator: 2, denominator: 4, percentage: 50 },
      },
    },
    uncontracted: 4,
  },
  requests: {
    received: 15,
    accepted: 10,
    pending: 2,
    acceptanceRate: { numerator: 10, denominator: 15, percentage: 66.67 },
  },
};

describe("getProviderConversion", () => {
  it("delegates to repository with optional query", async () => {
    const mockRepo: ProviderConversionRepository = {
      getConversion: vi.fn().mockResolvedValue(mockConversion),
    };

    const query = { from: "2026-08-01", to: "2026-08-31" };
    const result = await getProviderConversion(mockRepo, query);

    expect(mockRepo.getConversion).toHaveBeenCalledWith(query);
    expect(result).toBe(mockConversion);
  });
});
