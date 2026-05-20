import { getAuthService } from "@/lib/auth";
import ConsumerHome from "@/components/consumer/home/ConsumerHome";

export default async function ConsumerHomePage() {
  const session = await getAuthService().getSession();

  return <ConsumerHome session={session} />;
}
