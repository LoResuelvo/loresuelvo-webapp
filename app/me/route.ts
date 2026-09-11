import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getCurrentUserAction } from "@/app/api/me/actions";
import { parseCalendarCallbackResult } from "@/app/profile/calendar-result";
import { getAuthService } from "@/infrastructure/auth";
import type { AuthSession } from "@/infrastructure/auth/types";
import { ROUTES } from "@/lib/routes";

type ProfileRole = "consumer" | "provider";

function isProfileRole(value: unknown): value is ProfileRole {
  return value === "consumer" || value === "provider";
}

function profileRouteForRole(role: ProfileRole): string {
  return role === "provider" ? ROUTES.provider.profile : ROUTES.consumer.profile;
}

export async function GET(request: NextRequest): Promise<never> {
  const callbackValues = request.nextUrl.searchParams.getAll("calendar_result");
  const callbackResult = parseCalendarCallbackResult(
    callbackValues.length === 1 ? callbackValues[0] : callbackValues,
  );

  if (!callbackResult) {
    redirect(ROUTES.home);
  }

  let session: AuthSession | null = null;
  try {
    session = await getAuthService().getSession();
  } catch {
    redirect(ROUTES.home);
  }
  if (!session?.user || !session.accessToken) {
    redirect(ROUTES.home);
  }

  let role = session.user.role;
  if (!isProfileRole(role)) {
    try {
      const currentUser = await getCurrentUserAction();
      if (!isProfileRole(currentUser.role)) {
        redirect(ROUTES.home);
      }
      role = currentUser.role;
    } catch {
      redirect(ROUTES.home);
    }
  }

  const destination = profileRouteForRole(role);
  redirect(`${destination}?calendar_result=${callbackResult}`);
}
