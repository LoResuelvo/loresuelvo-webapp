import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "./lib/auth0";
import { ROUTES } from "./lib/routes";
import { getAuthService } from "./infrastructure/auth";
import { ApiUserRepository } from "./infrastructure/repositories/api-user-repository";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/auth")) {
    return await auth0.middleware(request);
  }

  const session = await getAuthService().getSession();

  if (!session && (pathname.startsWith("/consumidor") || pathname.startsWith("/prestador") || pathname.startsWith("/onboarding"))) {
    return NextResponse.redirect(new URL(ROUTES.home, request.url));
  }

  if (session && session.user.isOnboarded === false) {
    if (!pathname.startsWith(ROUTES.onboarding) && !pathname.startsWith("/provider/register/mercado-pago")) {
      return NextResponse.redirect(new URL(ROUTES.onboarding, request.url));
    }
  }

  if (session && session.user.isOnboarded === true) {
    let role = session.user.role;

    if (!role) {
      try {
        const userRepo = new ApiUserRepository();
        const currentUser = await userRepo.getCurrentUser();
        role = currentUser.role;
      } catch (e) {
        console.warn("Failed to fetch current user in middleware:", e);
      }
    }

    if (pathname === ROUTES.home) {
      const targetHome = role === "provider" ? ROUTES.provider.home : ROUTES.consumer.home;
      return NextResponse.redirect(new URL(targetHome, request.url));
    }

    if (role === "provider" && pathname.startsWith("/consumidor")) {
      return NextResponse.redirect(new URL(ROUTES.provider.home, request.url));
    }

    if (role === "consumer" && pathname.startsWith("/prestador")) {
      return NextResponse.redirect(new URL(ROUTES.consumer.home, request.url));
    }
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
     * - api/* (route handlers manage their own authentication)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/).*)"
  ]
};
