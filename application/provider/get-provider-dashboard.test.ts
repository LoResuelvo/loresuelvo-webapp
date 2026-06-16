import { describe, expect, it, vi } from "vitest";
import { getProviderDashboard } from "./get-provider-dashboard";
import { ProviderHomeRepository } from "@/ports/provider-home-repository";
import { ProviderHomeDashboard } from "@/domain/provider/types";

describe("getProviderDashboard", () => {
  const mockDashboard: ProviderHomeDashboard = {
    metrics: {
      incomeLabel: "$100",
      jobsCompletedCount: 4,
      ratingLabel: "5.0",
    },
    workRequests: [],
    scheduledJobs: [],
  };

  const mockRepository = {
    getDashboard: vi.fn(),
  } as unknown as ProviderHomeRepository;

  it("gets the provider dashboard information from the repository successfully", async () => {
    vi.mocked(mockRepository.getDashboard).mockResolvedValue(mockDashboard);

    const res = await getProviderDashboard("123", mockRepository);
    expect(res).toEqual(mockDashboard);
    expect(mockRepository.getDashboard).toHaveBeenCalledWith("123");
  });
});
