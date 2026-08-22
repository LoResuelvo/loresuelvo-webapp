import { getAuthService } from "@/infrastructure/auth";
import RegistrationForm from "@/components/onboarding/RegistrationForm";
import { ApiCategoryRepository } from "@/infrastructure/repositories/api-category-repository";
import { getConsumerHome } from "@/application/consumer/get-consumer-home";

export default async function OnboardingPage() {
  const session = await getAuthService().getSession();
  const categoryRepo = new ApiCategoryRepository();
  const categories = await getConsumerHome(categoryRepo);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-neutral p-4 font-sans text-brand-primary">
      <RegistrationForm session={session} categories={categories} className="max-w-[440px]" />
    </main>
  );
}
