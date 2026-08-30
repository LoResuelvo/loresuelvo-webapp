import { api } from "@/infrastructure/api/base-client";
import { ApiProviderProfile } from "@/infrastructure/api/types";
import { ProviderProfile } from "@/domain/provider/types";
import { ProviderProfileRepository } from "@/ports/consumer/provider-profile-repository";
import { mapApiProviderProfileToProvider } from "./provider-profile-mapper";

export class ApiProviderProfileRepository implements ProviderProfileRepository {
  async getById(providerId: number): Promise<ProviderProfile> {
    const data = await api.get<ApiProviderProfile>(`/providers/${providerId}`);
    return mapApiProviderProfileToProvider(data);
  }
}
