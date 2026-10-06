import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthService } from "@/infrastructure/auth";
import { getProviderReputation } from "@/application/provider/get-provider-reputation";
import { getProviderReputationAction } from "./actions";
import { t } from "@/infrastructure/i18n/translations";
import type { ProviderReputation } from "@/domain/provider/reputation";

vi.mock("@/infrastructure/auth", () => ({ getAuthService: vi.fn() }));
vi.mock("@/application/provider/get-provider-reputation", () => ({ getProviderReputation: vi.fn() }));
vi.mock("@/infrastructure/repositories/provider/api-provider-reputation-repository", () => ({ ApiProviderReputationRepository: class {} }));

const mockReputation: ProviderReputation = {
  calculatedAt: "2026-08-31T00:00:00-03:00",
  averageRating: 4.8,
  reviewCount: 5,
  ratingDistribution: [
    { rating: 5, count: 4 },
    { rating: 4, count: 1 },
    { rating: 3, count: 0 },
    { rating: 2, count: 0 },
    { rating: 1, count: 0 },
  ],
  eligiblePaidOrders: 6,
  reviewedPaidOrders: 5,
  coveragePercentage: 83.33,
  reviews: [],
  nextCursor: null,
};

describe("getProviderReputationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthService).mockReturnValue({
      getSession: vi.fn().mockResolvedValue({ user: { role: "provider" } }),
      updateSession: vi.fn(),
    });
  });

  it("returns reputation data for authorized provider", async () => {
    vi.mocked(getProviderReputation).mockResolvedValue(mockReputation);
    const result = await getProviderReputationAction();
    expect(result).toEqual({ success: true, data: mockReputation });
  });

  it("rejects non-provider session", async () => {
    vi.mocked(getAuthService).mockReturnValue({
      getSession: vi.fn().mockResolvedValue({ user: { role: "consumer" } }),
      updateSession: vi.fn(),
    });
    const result = await getProviderReputationAction();
    expect(result).toEqual({ success: false, error: t.providerReputation.unauthorized });
    expect(getProviderReputation).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated session", async () => {
    vi.mocked(getAuthService).mockReturnValue({
      getSession: vi.fn().mockResolvedValue(null),
      updateSession: vi.fn(),
    });
    const result = await getProviderReputationAction();
    expect(result).toEqual({ success: false, error: t.providerReputation.unauthorized });
    expect(getProviderReputation).not.toHaveBeenCalled();
  });

  it("does not expose technical errors", async () => {
    vi.mocked(getProviderReputation).mockRejectedValue(new Error("Database connection failed"));
    const result = await getProviderReputationAction();
    expect(result).toEqual({ success: false, error: t.providerReputation.error });
  });
});
