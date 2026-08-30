import { ProviderProfile } from "@/domain/provider/types";

export interface ProviderProfileRepository {
  getById(providerId: number): Promise<ProviderProfile>;
}
