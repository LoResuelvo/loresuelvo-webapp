import { cookies } from "next/headers";
import { AuthService, AuthSession, AppUser } from "./types";

// La cookie que Playwright setea antes de navegar en los tests E2E
export const MOCK_SESSION_COOKIE = "__e2e_session";

export class MockAuthAdapter implements AuthService {
  async getSession(): Promise<AuthSession | null> {
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get(MOCK_SESSION_COOKIE);
      if (!sessionCookie?.value) return null;
      return JSON.parse(decodeURIComponent(sessionCookie.value)) as AuthSession;
    } catch {
      // Cookie malformada o ausente = sesión nula
      return null;
    }
  }

  async updateSession(userUpdate: Partial<AppUser>): Promise<void> {
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get(MOCK_SESSION_COOKIE);
      if (!sessionCookie?.value) return;

      const session = JSON.parse(decodeURIComponent(sessionCookie.value)) as AuthSession;
      session.user = {
        ...session.user,
        ...userUpdate,
      };

      cookieStore.set(MOCK_SESSION_COOKIE, encodeURIComponent(JSON.stringify(session)), { path: "/" });
    } catch (e) {
      console.error("[MockAuthAdapter] Error al actualizar la sesión mockeada:", e);
    }
  }
}
