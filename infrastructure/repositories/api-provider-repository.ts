import { api } from "@/infrastructure/api/base-client";
import { Provider } from "@/domain/provider/types";
import { ProviderRepository } from "@/ports/provider-repository";

export class ApiProviderRepository implements ProviderRepository {
  async findByCategory(categoryId: number): Promise<Provider[]> {
    return api.get<Provider[]>(`/providers?category_id=${categoryId}`);
  }
}
