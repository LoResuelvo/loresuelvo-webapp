import { getProviderProfile } from "@/application/consumer/get-provider-profile";
import ProviderProfileView from "@/components/consumer/provider-profile/ProviderProfileView";
import { getAuthService } from "@/infrastructure/auth";
import { ApiProviderProfileRepository } from "@/infrastructure/repositories/api-provider-profile-repository";

interface PageProps {
  params: Promise<{ providerID: string }>;
}

export default async function ProviderProfilePage({ params }: PageProps) {
  const session = await getAuthService().getSession();
  const { providerID } = await params;
  const profileRepository = new ApiProviderProfileRepository();
  const provider = await getProviderProfile(profileRepository, Number(providerID));

  return <ProviderProfileView provider={provider} session={session} />;
}
