import { Auth0Adapter } from "./auth0-adapter";
import { DevAuthAdapter } from "./dev-adapter";
import { AuthService } from "./types";
import { usesE2EAdapters } from "@/infrastructure/config/runtime-env";

/**
 * Devuelve el AuthService apropiado según el entorno:
 * - staging/production: Auth0Adapter estricto, sin cookies de E2E.
 * - development/test: DevAuthAdapter para los escenarios locales y automatizados.
 */
export const getAuthService = (): AuthService => {
  return usesE2EAdapters() ? new DevAuthAdapter() : new Auth0Adapter();
};
