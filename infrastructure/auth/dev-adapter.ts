import { cookies } from "next/headers";
import { AuthService, AuthSession, AppUser } from "./types";
import { MockAuthAdapter } from "./mock-adapter";
import { Auth0Adapter } from "./auth0-adapter";
import { hasActiveE2EContext } from "@/infrastructure/api/e2e-stubs-utils";

/**
 * DevAuthAdapter - Composite adapter for non-production environments.
 * Flow:
 *   - Complete E2E cookie context → MockAuthAdapter
 *   - Otherwise                   → Auth0Adapter
 */
export class DevAuthAdapter implements AuthService {
  private readonly mockAdapter = new MockAuthAdapter();
  private readonly auth0Adapter = new Auth0Adapter();

  async getSession(): Promise<AuthSession | null> {
    const cookieStore = await cookies();
    if (hasActiveE2EContext(cookieStore.getAll())) {
      return this.mockAdapter.getSession();
    }
    return this.auth0Adapter.getSession();
  }

  async updateSession(userUpdate: Partial<AppUser>): Promise<void> {
    const cookieStore = await cookies();
    if (hasActiveE2EContext(cookieStore.getAll())) {
      await this.mockAdapter.updateSession(userUpdate);
    } else {
      await this.auth0Adapter.updateSession(userUpdate);
    }
  }
}
