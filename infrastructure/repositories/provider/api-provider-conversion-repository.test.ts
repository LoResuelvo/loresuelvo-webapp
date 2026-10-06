import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  ApiProviderConversionRepository,
  conversionEndpoint,
} from "./api-provider-conversion-repository";
import { api } from "@/infrastructure/api/base-client";

vi.mock("@/infrastructure/api/base-client", () => ({
  api: {
    get: vi.fn(),
  },
}));

const mockRaw = {
  period: {
    from: "2026-08-01T00:00:00-03:00",
    to: "2026-08-31T00:00:00-03:00",
    time_zone: "America/Argentina/Buenos_Aires",
  },
  observed_at: "2026-09-15T10:30:00-03:00",
  proposals: {
    stages: { issued: 10, contracted: 6, reported: 4, paid: 2 },
    rates: {
      contracted: {
        cohort: { numerator: 6, denominator: 10, percentage: 60 },
        previous_stage: { numerator: 6, denominator: 10, percentage: 60 },
      },
      reported: {
        cohort: { numerator: 4, denominator: 10, percentage: 40 },
        previous_stage: { numerator: 4, denominator: 6, percentage: 66.67 },
      },
      paid: {
        cohort: { numerator: 2, denominator: 10, percentage: 20 },
        previous_stage: { numerator: 2, denominator: 4, percentage: 50 },
      },
    },
    uncontracted: 4,
  },
  requests: {
    received: 15,
    accepted: 10,
    pending: 2,
    acceptance_rate: { numerator: 10, denominator: 15, percentage: 66.67 },
  },
};

describe("ApiProviderConversionRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("conversionEndpoint", () => {
    it("returns base endpoint when no query is provided", () => {
      expect(conversionEndpoint()).toBe("/providers/me/statistics/conversion");
    });

    it("appends query parameters when provided", () => {
      expect(
        conversionEndpoint({ from: "2026-08-01", to: "2026-08-31" })
      ).toBe("/providers/me/statistics/conversion?from=2026-08-01&to=2026-08-31");
    });
  });

  describe("getConversion", () => {
    it("fetches conversion from API and maps to domain model", async () => {
      vi.mocked(api.get).mockResolvedValue(mockRaw);

      const repo = new ApiProviderConversionRepository();
      const result = await repo.getConversion();

      expect(api.get).toHaveBeenCalledWith("/providers/me/statistics/conversion");
      expect(result.proposals.stages.issued).toBe(10);
      expect(result.proposals.stages.contracted).toBe(6);
    });
  });
});
