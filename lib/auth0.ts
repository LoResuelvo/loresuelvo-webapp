import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  authorizationParameters: {

    audience: process.env.AUTH0_AUDIENCE,
  },
  async beforeSessionSaved(session) {
    const apiUrl = process.env.API_URL;
    const user = session.user;
    const token = session.tokenSet?.accessToken;

    if (!token || !apiUrl) return session;

    // try to send user info to API
    try {

      await fetch(`${apiUrl}/consumers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          auth0_id: user.sub,
          email: user.email,
          nombre: user.given_name || "",
          apellido: user.family_name || "",
        }),
      });
    } catch (error) {
      console.error("Failed to send user info to API:", error);
    }

    return session;
  }
});