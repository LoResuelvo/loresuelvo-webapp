import { cookies } from "next/headers";
import { AuthService, AuthSession } from "./types";
import { MockAuthAdapter, MOCK_SESSION_COOKIE } from "./mock-adapter";
import { Auth0Adapter } from "./auth0-adapter";

/**
 * DevAuthAdapter - Composite adapter for non-production environments.
 * Flow:
 *   - Cookie __e2e_session present → MockAuthAdapter.getSession()
 *   - Cookie missing              → Auth0Adapter.getSession()
 */
export class DevAuthAdapter implements AuthService {
  private readonly mockAdapter = new MockAuthAdapter();
  private readonly auth0Adapter = new Auth0Adapter();

  async getSession(): Promise<AuthSession | null> {
    const cookieStore = await cookies();
    if (cookieStore.has(MOCK_SESSION_COOKIE)) {
      return this.mockAdapter.getSession();
    }
    return this.auth0Adapter.getSession();
  }
}
