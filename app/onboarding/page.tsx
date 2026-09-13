import { getAuthService } from "@/infrastructure/auth";
import RegistrationForm from "@/components/onboarding/RegistrationForm";
import { ApiCategoryRepository } from "@/infrastructure/repositories/consumer/api-category-repository";
import { getConsumerHome } from "@/application/consumer/get-consumer-home";
import { getGoogleMapsRuntimeConfig } from "@/infrastructure/config/server-env";
import { ApiUserRepository } from "@/infrastructure/repositories/onboarding/api-user-repository";
import type { IdentityVerificationStatus } from "@/domain/identity-verification/types";
import type { ProviderCurrentUser } from "@/domain/user/types";
import type { RegistrationStep } from "@/components/onboarding/useRegistrationForm";

interface OnboardingPageProps {
  searchParams?: Promise<{ stage?: string | string[] }>;
}

function hasIdentityStage(stage: string | string[] | undefined): boolean {
  return stage === "identity" || (Array.isArray(stage) && stage[0] === "identity");
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const session = await getAuthService().getSession();
  const categoryRepo = new ApiCategoryRepository();
  const categories = await getConsumerHome(categoryRepo);
  const googleMapsConfig = getGoogleMapsRuntimeConfig();

  let initialStep: RegistrationStep | undefined;
  let initialIdentityStatus: IdentityVerificationStatus | null = "unverified";

  if (
    hasIdentityStage((await searchParams)?.stage) &&
    session?.user.role === "provider" &&
    session.user.isOnboarded
  ) {
    initialStep = "identity";
    try {
      const currentUser = await new ApiUserRepository().getCurrentUser();
      initialIdentityStatus =
        currentUser.role === "provider"
          ? (currentUser as ProviderCurrentUser).identityVerificationStatus
          : null;
    } catch {
      initialIdentityStatus = null;
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-neutral p-4 font-sans text-brand-primary">
      <RegistrationForm
        session={session}
        categories={categories}
        googleMapsConfig={googleMapsConfig}
        initialStep={initialStep}
        initialIdentityStatus={initialIdentityStatus}
        className="max-w-[440px]"
      />
    </main>
  );
}
