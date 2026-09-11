import { redirect } from "next/navigation";
import { getCurrentUserAction } from "@/app/api/me/actions";
import { getAuthService } from "@/infrastructure/auth";
import { ROUTES } from "@/lib/routes";

export async function getAuthenticatedProfile() {
  const session = await getAuthService().getSession();

  if (!session?.user || !session.accessToken) {
    redirect(ROUTES.home);
  }

  return getCurrentUserAction();
}
