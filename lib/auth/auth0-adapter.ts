import { auth0 } from "@/lib/auth0";
import { AuthService, AuthSession } from "./types";

export class Auth0Adapter implements AuthService {
  async getSession(): Promise<AuthSession | null> {
    const session = await auth0.getSession();

    if (!session || !session.user) return null;

    return {
      user: {
        id: session.user.sub,
        email: session.user.email || "",
        firstName: session.user.given_name || "",
        lastName: session.user.family_name || "",
      },
      accessToken: session.tokenSet?.accessToken,
    };
  }
}
