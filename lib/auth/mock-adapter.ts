import { AuthService, AuthSession } from "./types";

export class MockAuthAdapter implements AuthService {
  async getSession(): Promise<AuthSession | null> {
    if (process.env.MOCK_AUTH_LOGGED_OUT === "true") {
      return null;
    }

    return {
      user: {
        id: "mock-auth0-id-123",
        email: "test@loresuelvo.com",
        firstName: "andy",
        lastName: "crack",
      },
      accessToken: "mock-jwt-token-abc-123",
    };
  }
}
