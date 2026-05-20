import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  authorizationParameters: {

    audience: process.env.AUTH0_AUDIENCE,
  },
  async beforeSessionSaved(session) {
    const apiUrl = process.env.API_URL;
    const token = session.tokenSet?.accessToken;

    if (!token || !apiUrl) return session;

    // try to send user info to API
    try {
      const response = await fetch(`${apiUrl}/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.status === 404) {
        session.user.isOnboarded = false;
      } else {
        const userData = await response.json();
        session.user.isOnboarded = true;
        session.user.role = userData.Role;
      }



      // await fetch(`${apiUrl}/consumers`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     "Authorization": `Bearer ${token}`
      //   },
      //   body: JSON.stringify({
      //     email: user.email,
      //     name: user.given_name || "",
      //     surname: user.family_name || "",
      //   }),
      // });
    } catch (error) {
      console.error(error);
    }

    return session;
  }
});