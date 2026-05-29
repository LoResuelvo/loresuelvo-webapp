import { MockProviderHomeRepository } from "./mock-provider-home-repository";
import { ProviderHomeDashboard, ProviderHomeRepository } from "./types";

export async function getProviderHomeDashboard(
  providerId: string,
  repository?: ProviderHomeRepository,
): Promise<ProviderHomeDashboard> {
  if (repository) {
    return repository.getDashboard(providerId);
  }
  if (providerId === "provider-home-001") {
    return new MockProviderHomeRepository().getDashboard(providerId);
  }
  return { workRequests: [] };
}
