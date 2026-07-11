import { getAuthService } from "@/infrastructure/auth";
import ProviderHome from "@/components/provider/home/ProviderHome";
import { getProviderDashboard } from "@/application/provider/get-provider-dashboard";
import { ApiProviderHomeRepository } from "@/infrastructure/repositories/api-provider-home-repository";
import { getServiceProposalsAction } from "@/app/prestador/mensajes/actions";
import { ServiceProposalSummary } from "@/domain/messaging/types";

export default async function PrestadorHomePage() {
  const session = await getAuthService().getSession();
  const providerHomeRepo = new ApiProviderHomeRepository();
  const dashboard = await getProviderDashboard(session?.user.id ?? "", providerHomeRepo);

  let acceptedProposals: ServiceProposalSummary[] = [];
  try {
    const allProposals = await getServiceProposalsAction();
    acceptedProposals = allProposals.filter((p) => p.status === "accepted");
  } catch (error) {
    console.error("Error fetching service proposals:", error);
  }

  return <ProviderHome session={session} workRequests={dashboard.workRequests} scheduledJobs={acceptedProposals} metrics={dashboard.metrics} />;
}

