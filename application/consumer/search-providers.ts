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
  let providers: Provider[] = [];
  let selectedCategory: Category | null = null;

  try {
    if (categoryId) {
      const categories = await categoryRepository.getAll();
      selectedCategory = categories.find(c => c.id === categoryId) || null;
      providers = await providerRepository.findByCategory(categoryId);
    }
  } catch (error) {
    console.error("Error searching providers in use case:", error);
  }

  return { providers, selectedCategory };
}
