import { Provider } from "@/domain/provider/types";
import { ProviderProfileRepository } from "@/ports/provider-profile-repository";

export async function getProviderProfile(
  repository: ProviderProfileRepository,
  providerId: number,
): Promise<Provider> {
  return repository.getById(providerId);
}
