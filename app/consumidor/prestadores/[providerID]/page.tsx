import { notFound } from "next/navigation";
import { getProviderProfile } from "@/application/consumer/get-provider-profile";
import ProviderProfileView from "@/components/consumer/provider-profile/ProviderProfileView";
import { getAuthService } from "@/infrastructure/auth";
import { ApiClientError } from "@/infrastructure/api/base-client";
import { ApiProviderProfileRepository } from "@/infrastructure/repositories/consumer/api-provider-profile-repository";

interface PageProps {
  params: Promise<{ providerID: string }>;
}

export default async function ProviderProfilePage({ params }: PageProps) {
  const session = await getAuthService().getSession();
  const { providerID } = await params;
  const profileRepository = new ApiProviderProfileRepository();

  try {
    const provider = await getProviderProfile(profileRepository, Number(providerID));
    return <ProviderProfileView provider={provider} session={session} />;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

