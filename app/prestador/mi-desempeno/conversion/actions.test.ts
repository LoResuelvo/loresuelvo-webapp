import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthService } from "@/infrastructure/auth";
import { getProviderConversion } from "@/application/provider/get-provider-conversion";
import { getProviderConversionAction } from "./actions";
import { t } from "@/infrastructure/i18n/translations";
import type { ProviderConversion } from "@/domain/provider/conversion";

vi.mock("@/infrastructure/auth", () => ({ getAuthService: vi.fn() }));
vi.mock("@/application/provider/get-provider-conversion", () => ({ getProviderConversion: vi.fn() }));
vi.mock("@/infrastructure/repositories/provider/api-provider-conversion-repository", () => ({
  ApiProviderConversionRepository: class {},
}));

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

describe("getProviderConversionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthService).mockReturnValue({
      getSession: vi.fn().mockResolvedValue({ user: { role: "provider" } }),
      updateSession: vi.fn(),
    });
  });

  it("returns conversion data for authorized provider", async () => {
    vi.mocked(getProviderConversion).mockResolvedValue(mockConversion);
    const result = await getProviderConversionAction();
    expect(result).toEqual({ success: true, data: mockConversion });
  });

  it("rejects non-provider session", async () => {
    vi.mocked(getAuthService).mockReturnValue({
      getSession: vi.fn().mockResolvedValue({ user: { role: "consumer" } }),
      updateSession: vi.fn(),
    });
    const result = await getProviderConversionAction();
    expect(result).toEqual({ success: false, error: t.providerConversion.unauthorized });
    expect(getProviderConversion).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated session", async () => {
    vi.mocked(getAuthService).mockReturnValue({
      getSession: vi.fn().mockResolvedValue(null),
      updateSession: vi.fn(),
    });
    const result = await getProviderConversionAction();
    expect(result).toEqual({ success: false, error: t.providerConversion.unauthorized });
    expect(getProviderConversion).not.toHaveBeenCalled();
  });

  it("does not expose technical errors", async () => {
    vi.mocked(getProviderConversion).mockRejectedValue(new Error("API failure"));
    const result = await getProviderConversionAction();
    expect(result).toEqual({ success: false, error: t.providerConversion.error });
  });
});
