import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { getApiUrl, getAuth0RuntimeConfig } from "@/infrastructure/config/server-env";

let auth0Client: Auth0Client | undefined;

type SessionRole = "consumer" | "provider";

interface ApiSessionProfile {
  name: string;
  surname: string;
  role: SessionRole;
  profilePhotoUrl?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSessionRole(value: unknown): value is SessionRole {
  return value === "consumer" || value === "provider";
}

function parseApiSessionProfile(value: unknown): ApiSessionProfile | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.name) ||
    !isNonEmptyString(value.surname) ||
    !isSessionRole(value.role)
  ) {
    return null;
  }

  const profilePhoto = isRecord(value.profile_photo) ? value.profile_photo.url : undefined;
  const profilePhotoUrl = isNonEmptyString(profilePhoto) ? profilePhoto : undefined;

  return {
    name: value.name,
    surname: value.surname,
    role: value.role,
    ...(profilePhotoUrl ? { profilePhotoUrl } : {}),
  };
}

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
          const userData: unknown = await response.json();
          const profile = parseApiSessionProfile(userData);

          if (profile) {
            session.user.isOnboarded = true;
            session.user.given_name = profile.name;
            session.user.family_name = profile.surname;
            session.user.role = profile.role;
            if (profile.profilePhotoUrl) {
              session.user.profilePhotoUrl = profile.profilePhotoUrl;
            }
          }
        }
      } catch (error) {
        console.warn("[auth0] beforeSessionSaved: could not reach API, defaulting to isOnboarded=false", error);
      }

      return session;
    },
  });

  return auth0Client;
}
