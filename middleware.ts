import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "./lib/auth0";
import { ROUTES } from "./lib/routes";
import { getAuthService } from "./lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/auth")) {
    return await auth0.middleware(request);
  }

  const session = await getAuthService().getSession();

  if (!session && (pathname.startsWith("/consumer") || pathname.startsWith("/prestador"))) {
    return NextResponse.redirect(new URL(ROUTES.home, request.url));
  }

  if (session && session.user.isOnboarded === false) {
    if (!pathname.startsWith(ROUTES.onboarding)) {
      return NextResponse.redirect(new URL(ROUTES.onboarding, request.url));
    }
  }

  if (session && session.user.isOnboarded === true && pathname === ROUTES.home) {
    const role = session.user.role; // TODO: hardcoded fields
    const targetHome = role === "provider" ? ROUTES.provider.home : ROUTES.consumer.home;
    return NextResponse.redirect(new URL(targetHome, request.url));
  }

  return NextResponse.next();
}


export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"
  ]
};
