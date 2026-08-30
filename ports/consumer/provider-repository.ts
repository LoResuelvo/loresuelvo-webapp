import { Provider } from "@/domain/provider/types";

export interface ProviderRepository {
  findByCategory(categoryId: number): Promise<Provider[]>;
}
