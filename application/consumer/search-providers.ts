import { CategoryRepository } from "@/ports/category-repository";
import { ProviderRepository } from "@/ports/provider-repository";
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

  const categories = await categoryRepository.getAll();
  const selectedCategory = categories.find(c => c.id === categoryId) || null;
  const providers = await providerRepository.findByCategory(categoryId);

  return { providers, selectedCategory };
}
