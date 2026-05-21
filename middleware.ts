import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "./lib/auth0";
import { ROUTES } from "./lib/routes";



export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/auth")) {
    return await auth0.middleware(request);
  }

  const session = await auth0.getSession();

  if (session && session.user.isOnboarded === false) {
    if (!pathname.startsWith(ROUTES.onboarding)) {
      return NextResponse.redirect(new URL(ROUTES.onboarding, request.url));
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
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"
  ]
};
