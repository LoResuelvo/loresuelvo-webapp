"use server";

import { getAuthService } from "@/lib/auth";
import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/base-client";

export async function submitRegistration(formData: FormData) {
  const session = await getAuthService().getSession();

  if (!session) {
    throw new Error("User is unauthenticated");
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
    throw new Error("Failed to register user");
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
