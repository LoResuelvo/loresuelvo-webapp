import { getAuthService } from "@/infrastructure/auth";
import ProviderHome from "@/components/provider/home/ProviderHome";
import { getProviderDashboard } from "@/application/provider/get-provider-dashboard";
import { ApiProviderHomeRepository } from "@/infrastructure/repositories/api-provider-home-repository";

export default async function PrestadorHomePage() {
  const session = await getAuthService().getSession();
  const providerHomeRepo = new ApiProviderHomeRepository();
  const dashboard = await getProviderDashboard(session?.user.id ?? "", providerHomeRepo);

  return <ProviderHome session={session} workRequests={dashboard.workRequests} scheduledJobs={dashboard.scheduledJobs} metrics={dashboard.metrics} />;
}

