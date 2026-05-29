import { MockProviderHomeRepository } from "./mock-provider-home-repository";
import { ProviderHomeDashboard, ProviderHomeRepository } from "./types";

export async function getProviderHomeDashboard(
  providerId: string,
  repository: ProviderHomeRepository = new MockProviderHomeRepository(),
): Promise<ProviderHomeDashboard> {
  return repository.getDashboard(providerId);
}
