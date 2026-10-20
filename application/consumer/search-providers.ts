import { CategoryRepository } from "@/ports/consumer/category-repository";
import { ProviderRepository } from "@/ports/consumer/provider-repository";
import { Category } from "@/domain/shared/types";
import { Provider } from "@/domain/provider/types";

interface SearchProvidersResult {
  providers: Provider[];
  selectedCategory: Category | null;
}

export async function searchProviders(
  categoryRepository: CategoryRepository,
  providerRepository: ProviderRepository,
  categoryId?: number
): Promise<SearchProvidersResult> {
  if (!categoryId) {
    return { providers: [], selectedCategory: null };
  }

  const [categories, providers] = await Promise.all([
    categoryRepository.getAll(),
    providerRepository.findByCategory(categoryId),
  ]);
  const selectedCategory = categories.find(c => c.id === categoryId) || null;

  return { providers, selectedCategory };
}
