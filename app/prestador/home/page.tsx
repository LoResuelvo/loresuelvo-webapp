import { getAuthService } from "@/lib/auth";
import ProviderHome from "@/components/provider/home/ProviderHome";
import { getProviderHomeDashboard } from "@/lib/provider-home/get-provider-home-dashboard";

export default async function PrestadorHomePage() {
  const session = await getAuthService().getSession();
  const dashboard = await getProviderHomeDashboard(session?.user.id ?? "");

  return <ProviderHome session={session} workRequests={dashboard.workRequests} />;
}
