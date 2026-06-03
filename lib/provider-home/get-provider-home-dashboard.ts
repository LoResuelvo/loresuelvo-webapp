import { ApiProviderHomeRepository } from "./api-provider-home-repository";
import { ProviderHomeDashboard, ProviderHomeRepository } from "./types";

export async function getProviderHomeDashboard(
  providerId: string,
  repository?: ProviderHomeRepository,
): Promise<ProviderHomeDashboard> {
  if (repository) {
    return repository.getDashboard(providerId);
  }
  return new ApiProviderHomeRepository().getDashboard(providerId);
}