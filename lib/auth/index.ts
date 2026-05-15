import { Auth0Adapter } from "./auth0-adapter";
import { MockAuthAdapter } from "./mock-adapter";
import { AuthService } from "./types";

let authServiceInstance: AuthService;

export const getAuthService = (): AuthService => {
  if (!authServiceInstance) {
    if (process.env.NODE_ENV === "test" || process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true") {
      authServiceInstance = new MockAuthAdapter();
    } else {
      authServiceInstance = new Auth0Adapter();
    }
  }
  return authServiceInstance;
};
