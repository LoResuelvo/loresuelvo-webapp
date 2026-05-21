"use server";

import { getAuthService } from "@/lib/auth";
import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/base-client";

export async function submitRegistration(formData: FormData) {
  console.log("-> submitRegistration: Iniciando Server Action");
  
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  console.log("-> submitRegistration: cookies =", cookieStore.getAll().map(c => c.name));

  const auth0Session = await auth0.getSession();
  console.log("-> submitRegistration: auth0Session =", !!auth0Session);
  
  const session = await getAuthService().getSession();
  console.log("-> submitRegistration: authService session =", !!session);

  if (!session) {
    console.error("User is unauthenticated (session is null)");
    return;
  }

  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;

  try {
    await api.post("/consumers", {
      email: session.user.email,
      name: firstName,
      surname: lastName,
    });
  } catch (error) {
    console.error("Error al registrar usuario:", error);
  }

  try {
    const auth0Session = await auth0.getSession();
    if (auth0Session) {
      await auth0.updateSession({
        ...auth0Session,
        user: {
          ...auth0Session.user,
          isOnboarded: true,
        },
      });
    }
  } catch (e) {
    console.error("No se pudo actualizar la sesión de Auth0", e);
  }

  redirect("/consumer/home");
}
