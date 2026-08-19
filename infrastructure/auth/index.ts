import { Auth0Adapter } from "./auth0-adapter";
import { DevAuthAdapter } from "./dev-adapter";
import { AuthService } from "./types";

/**
 * Devuelve el AuthService apropiado según el entorno:
 * - APP_ENV === "production": Auth0Adapter estricto (ignora cookies de mock, fuerza Auth0 real en la nube).
 * - Default (development, test, staging): DevAuthAdapter (detecta cookies de mock dinámicas en tests y delega a Auth0 si no hay cookies).
 */
export const getAuthService = (): AuthService => {
  if (process.env.APP_ENV === "production") {
    return new Auth0Adapter();
  }
  return new DevAuthAdapter();
};
