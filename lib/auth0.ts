import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { getApiUrl, getAuth0RuntimeConfig } from "@/infrastructure/config/server-env";

let auth0Client: Auth0Client | undefined;

export function getAuth0Client(): Auth0Client {
  if (auth0Client) return auth0Client;

  const config = getAuth0RuntimeConfig();
  auth0Client = new Auth0Client({
    domain: config.domain,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    secret: config.secret,
    appBaseUrl: config.appBaseUrl,
    authorizationParameters: {
      audience: config.audience,
    },
    async beforeSessionSaved(session) {
      const apiUrl = getApiUrl();
      const token = session.tokenSet?.accessToken;
      session.user.isOnboarded = false;

      if (!token) return session;

      try {
        const response = await fetch(`${apiUrl}/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          session.user.isOnboarded = true;
          session.user.given_name = userData.Name;
          session.user.family_name = userData.Surname;
          session.user.role = userData.Role;
        }
      } catch (error) {
        console.warn("[auth0] beforeSessionSaved: could not reach API, defaulting to isOnboarded=false", error);
      }

      return session;
    },
  });

  return auth0Client;
}
