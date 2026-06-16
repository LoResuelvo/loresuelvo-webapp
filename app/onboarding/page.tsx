import { getAuthService } from "@/infrastructure/auth";
import RegistrationForm from "@/components/onboarding/RegistrationForm";
import { api } from "@/infrastructure/api/base-client";
import { Category } from "@/infrastructure/api/types";

export default async function OnboardingPage() {
  const session = await getAuthService().getSession();

  let categories: Category[] = [];
  try {
    categories = await api.get<Category[]>("/categories");
  } catch (error) {
    console.error("Error fetching categories:", error);
  }

  return <RegistrationForm session={session} categories={categories} />;
}
