import { getAuthService } from "@/lib/auth";
import { api } from "@/lib/api/base-client";
import { Category, Provider } from "@/lib/api/types";
import SearchClient from "@/components/consumer/search/SearchClient";

interface PageProps {
  searchParams: Promise<{ category_id?: string }>;
}

export default async function BuscarPage({ searchParams }: PageProps) {
  const session = await getAuthService().getSession();
  const params = await searchParams;
  const categoryId = params.category_id;

  let categories: Category[] = [];
  let providers: Provider[] = [];
  let selectedCategory: Category | null = null;

  try {
    categories = await api.get<Category[]>("/categories");
    if (categoryId) {
      selectedCategory = categories.find(c => c.id === parseInt(categoryId)) || null;
      providers = await api.get<Provider[]>(`/providers?category_id=${categoryId}`);
    }
  } catch (error) {
    console.error("Error fetching search data:", error);
  }

  return (
    <SearchClient
      session={session}
      providers={providers}
      selectedCategory={selectedCategory}
    />
  );
}
