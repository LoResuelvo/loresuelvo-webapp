import { getAuthService } from "@/infrastructure/auth";
import ProviderHome from "@/components/provider/home/ProviderHome";
import { getProviderDashboard } from "@/application/provider/get-provider-dashboard";
import { ApiProviderHomeRepository } from "@/infrastructure/repositories/api-provider-home-repository";
import { getServiceProposalsAction } from "@/app/prestador/mensajes/actions";
import { ServiceProposalSummary } from "@/domain/messaging/types";
import { getCurrentUserAction } from "@/app/api/me/actions";
import { ProviderCurrentUser } from "@/domain/user/types";

export default async function PrestadorHomePage() {
  let session = await getAuthService().getSession();
  let currentUser = null;
  try {
    currentUser = await getCurrentUserAction();
    if (session?.user && currentUser) {
      session = {
        ...session,
        user: {
          ...session.user,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          profilePhotoUrl: currentUser.profilePhoto?.url ?? session.user.profilePhotoUrl,
          role: currentUser.role,
        },
      };
    }
  } catch {
    // Graceful degradation: fallback to Auth0 session if /me fails
  }

  const providerHomeRepo = new ApiProviderHomeRepository();
  const dashboard = await getProviderDashboard(session?.user.id ?? "", providerHomeRepo);

  let acceptedProposals: ServiceProposalSummary[] = [];
  try {
    const allProposals = await getServiceProposalsAction();
    acceptedProposals = allProposals.filter((p) => p.status === "accepted");
  } catch (error) {
    console.error("Error fetching service proposals:", error);
  }

  const categoryName = currentUser?.role === "provider"
    ? (currentUser as ProviderCurrentUser).category?.name
    : undefined;

  return (
    <ProviderHome
      session={session}
      categoryName={categoryName}
      workRequests={dashboard.workRequests}
      scheduledJobs={acceptedProposals}
      metrics={dashboard.metrics}
    />
  );
}
