import { getAuthService } from "@/lib/auth";
import ConsumerMessagesClient from "./ConsumerMessagesClient";

export default async function ConsumerMessagesPage() {
  const session = await getAuthService().getSession();

  return <ConsumerMessagesClient session={session} />;
}