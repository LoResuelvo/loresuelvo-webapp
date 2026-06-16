import { ProviderHomeRepository } from "@/ports/provider-home-repository";
import { ProviderHomeDashboard } from "@/domain/provider/types";

export async function getProviderDashboard(
  providerId: string,
  repository: ProviderHomeRepository
): Promise<ProviderHomeDashboard> {
  return repository.getDashboard(providerId);
}
