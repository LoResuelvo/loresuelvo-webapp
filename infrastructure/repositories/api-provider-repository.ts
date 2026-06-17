import { api } from "@/infrastructure/api/base-client";
import { ApiProvider } from "@/infrastructure/api/types";
import { Provider } from "@/domain/provider/types";
import { ProviderRepository } from "@/ports/provider-repository";
import { mapApiToProvider } from "./provider-mapper";

export class ApiProviderRepository implements ProviderRepository {
  async findByCategory(categoryId: number): Promise<Provider[]> {
    const data = await api.get<ApiProvider[]>(`/providers?category_id=${categoryId}`);
    return data.map(mapApiToProvider);
  }
}
