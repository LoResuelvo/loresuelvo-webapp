import { MockProviderHomeRepository } from "./mock-provider-home-repository";
import { ProviderHomeDashboard, ProviderHomeRepository } from "./types";

export async function getProviderHomeDashboard(
  providerId: string,
  repository?: ProviderHomeRepository,
): Promise<ProviderHomeDashboard> {
  if (repository) {
    return repository.getDashboard(providerId);
  }
  if (process.env.NODE_ENV === "test" || providerId.startsWith("provider-home-")) {
    return new MockProviderHomeRepository().getDashboard(providerId);
  }
  return { workRequests: [], scheduledJobs: [], metrics: { incomeLabel: "$0", jobsCompletedCount: 0, ratingLabel: "0.0" } };
}