"use server";

import { getAuthService } from "@/lib/auth";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/base-client";

export async function submitRegistration(formData: FormData) {
  console.log("-> submitRegistration: Iniciando Server Action");
  
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
    await getAuthService().updateSession({
      firstName,
      lastName,
      isOnboarded: true,
    });
    console.log("-> submitRegistration: session updated successfully");
  } catch (error) {
    console.error("Error al actualizar la sesión:", error);
  }

  redirect("/consumer/home");
}
