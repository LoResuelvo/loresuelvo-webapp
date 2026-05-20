import { getAuthService } from "@/lib/auth";
import RegistrationForm from "@/components/onboarding/RegistrationForm";

export default async function OnboardingPage() {
  const session = await getAuthService().getSession();

  return <RegistrationForm session={session} />;
}
