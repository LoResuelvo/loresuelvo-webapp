import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  authorizationParameters: {
    audience: process.env.API_URL || "https://api-test.loresuelvo.com.ar",
  },
  async beforeSessionSaved(session, req) {
    // Este código corre en tu servidor de Next.js justo después de que el usuario
    // se autentica en Auth0, pero ANTES de crear la cookie final.
    
    const apiUrl = process.env.API_URL || "http://localhost:8080";
    const user = session.user;

    try {
      // Le mandamos los datos del usuario a tu API en Go
      // Tu API debería hacer un "Upsert" (Crear si no existe, actualizar si ya existe)
      const token = session.tokenSet?.accessToken;
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      // Si tenemos el token JWT, lo inyectamos en el header
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      await fetch(`${apiUrl}/api/usuarios`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          auth0_id: user.sub,
          email: user.email,
          nombre: user.given_name || "Sin Nombre",
          apellido: user.family_name || "Sin Apellido",
        }),
      });
    } catch (error) {
      console.error("Fallo al sincronizar usuario con la API de Go:", error);
      // No lanzamos el error para no romperle el login al usuario si Go está caído
    }

    return session;
  }
});