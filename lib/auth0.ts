import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  authorizationParameters: {

    audience: process.env.AUTH0_AUDIENCE,
  },
  async beforeSessionSaved(session) {
    const apiUrl = process.env.API_URL;
    const token = session.tokenSet?.accessToken;
    session.user.isOnboarded = false;

    if (!token || !apiUrl) return session;

    try {
      const response = await fetch(`${apiUrl}/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
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
  }
});