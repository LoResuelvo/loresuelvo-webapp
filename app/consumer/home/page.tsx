import { getAuthService } from "@/lib/auth";
import ConsumerHome from "@/components/consumer/home/ConsumerHome";
import { api } from "@/lib/api/base-client";
import { Category } from "@/lib/api/types";

export default async function ConsumerHomePage() {
  const session = await getAuthService().getSession();

  let categories: Category[] = [];
  try {
    categories = await api.get<Category[]>("/categories");
  } catch (error) {
    console.error("Error fetching categories:", error);
  }

  return <ConsumerHome session={session} categories={categories} />;
}
