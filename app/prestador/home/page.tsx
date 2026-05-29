import { getAuthService } from "@/lib/auth";
import ProviderHome from "@/components/provider/home/ProviderHome";

export default async function PrestadorHomePage() {
  const session = await getAuthService().getSession();

  return <ProviderHome session={session} />;
}
