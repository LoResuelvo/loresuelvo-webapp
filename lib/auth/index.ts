import { Auth0Adapter } from "./auth0-adapter";
import { DevAuthAdapter } from "./dev-adapter";
import { AuthService } from "./types";

/**
 * Devuelve el AuthService apropiado según el entorno:
 * - production: Auth0Adapter (auth real, sin fallback a mock)
 * - development/test: DevAuthAdapter (auto-detecta cookie de mock, cae en Auth0 si no hay)
 *
 * En desarrollo no se necesita ninguna variable de entorno para usar el mock.
 * Playwright simplemente setea la cookie __e2e_session antes de navegar.
 */
export const getAuthService = (): AuthService => {
  if (process.env.NODE_ENV === "production") {
    return new Auth0Adapter();
  }
  return new DevAuthAdapter();
};
