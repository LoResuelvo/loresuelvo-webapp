import { ProviderProfile } from "@/domain/provider/types";
import { ProviderProfileRepository } from "@/ports/consumer/provider-profile-repository";

export async function getProviderProfile(
  repository: ProviderProfileRepository,
  providerId: number,
): Promise<ProviderProfile> {
  return repository.getById(providerId);
}
