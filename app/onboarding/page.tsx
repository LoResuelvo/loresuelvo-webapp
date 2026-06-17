import { getAuthService } from "@/infrastructure/auth";
import RegistrationForm from "@/components/onboarding/RegistrationForm";
import { api } from "@/infrastructure/api/base-client";
import { Category } from "@/domain/shared/types";

export default async function OnboardingPage() {
  const session = await getAuthService().getSession();

  let categories: Category[] = [];
  try {
    categories = await api.get<Category[]>("/categories");
  } catch (error) {
    console.error("Error fetching categories:", error);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-neutral p-4 font-sans text-brand-primary">
      <RegistrationForm session={session} categories={categories} className="max-w-[440px]" />
    </main>
  );
}
