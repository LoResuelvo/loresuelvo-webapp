import { getAuthService } from "@/infrastructure/auth";
import { searchProviders } from "@/application/consumer/search-providers";
import { ApiCategoryRepository } from "@/infrastructure/repositories/api-category-repository";
import { ApiProviderRepository } from "@/infrastructure/repositories/api-provider-repository";
import SearchClient from "@/components/consumer/search/SearchClient";

interface PageProps {
  searchParams: Promise<{ category_id?: string }>;
}

export default async function BuscarPage({ searchParams }: PageProps) {
  const session = await getAuthService().getSession();
  const params = await searchParams;
  const categoryId = params.category_id ? parseInt(params.category_id, 10) : undefined;

  const categoryRepo = new ApiCategoryRepository();
  const providerRepo = new ApiProviderRepository();

  const { providers, selectedCategory } = await searchProviders(
    categoryRepo,
    providerRepo,
    categoryId
  );

  return (
    <SearchClient
      session={session}
      providers={providers}
      selectedCategory={selectedCategory}
    />
  );
}

