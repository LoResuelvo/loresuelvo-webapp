import { getAuthService } from "@/lib/auth";
import RegistrationForm from "@/components/onboarding/RegistrationForm";
import { api } from "@/lib/api/base-client";
import { Category } from "@/lib/api/types";

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
