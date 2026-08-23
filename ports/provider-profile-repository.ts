import { Provider } from "@/domain/provider/types";

export interface ProviderProfileRepository {
  getById(providerId: number): Promise<Provider>;
}
