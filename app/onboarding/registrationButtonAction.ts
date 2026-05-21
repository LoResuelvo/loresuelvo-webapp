"use server";

import { getAuthService } from "@/lib/auth";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/base-client";

type UserRole = "consumer" | "provider";

export async function submitRegistration(formData: FormData) {
  console.log("-> submitRegistration: Iniciando Server Action");
  
  const session = await getAuthService().getSession();
  console.log("-> submitRegistration: authService session =", !!session);

  if (!session) {
    console.error("User is unauthenticated (session is null)");
    throw new Error("User is unauthenticated");
  }

  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const rawRole = formData.get("role") as string;
  const role: UserRole = rawRole === "provider" ? "provider" : "consumer";

  if (role === "provider") {
    await api.post("/providers", {
      email: session.user.email,
      name: firstName,
      surname: lastName,
    });
  } else {
    await api.post("/consumers", {
      email: session.user.email,
      name: firstName,
      surname: lastName,
    });
  }

  try {
    await getAuthService().updateSession({
      firstName,
      lastName,
      isOnboarded: true,
      role,
    });
    console.log("-> submitRegistration: session updated successfully");
  } catch (error) {
    console.error("Error al actualizar la sesión:", error);
  }

  if (role === "provider") {
    redirect("/prestador/home");
  } else {
    redirect("/consumer/home");
  }
}
