import { auth0 } from "@/lib/auth0";
import { AuthService, AuthSession, AppUser } from "./types";

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
        isOnboarded: session.user.isOnboarded ?? false
      },
      accessToken: session.tokenSet?.accessToken,
    };
  }

  async updateSession(userUpdate: Partial<AppUser>): Promise<void> {
    const session = await auth0.getSession();
    if (!session || !session.user) return;

    const updatedUser = { ...session.user };
    if (userUpdate.firstName !== undefined) updatedUser.given_name = userUpdate.firstName;
    if (userUpdate.lastName !== undefined) updatedUser.family_name = userUpdate.lastName;
    if (userUpdate.isOnboarded !== undefined) updatedUser.isOnboarded = userUpdate.isOnboarded;

    await auth0.updateSession({
      ...session,
      user: updatedUser,
    });
  }
}
