"use server";

import { getAuthService } from "@/lib/auth";
import { api } from "@/lib/api/base-client";
import {ROUTES} from "@/lib/routes";


type UserRole = "consumer" | "provider";

interface RegisterUserData {
  email: string;
  name: string;
  surname: string;
}

async function registerProvider(data: RegisterUserData, categoryId: number, profilePhotoId?: string) {
  return api.post<{ profile_photo_url?: string }>("/providers", {
    email: data.email,
    name: data.name,
    surname: data.surname,
    category_id: categoryId,
    profile_photo_file_id: profilePhotoId,
  });
}

async function registerConsumer(data: RegisterUserData) {
  return api.post("/consumers", {
    email: data.email,
    name: data.name,
    surname: data.surname,
  });
}

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

  const userData: RegisterUserData = {
    email: session.user.email,
    name: firstName,
    surname: lastName,
  };

  let profilePhotoUrl: string | undefined = undefined;

  if (role === "provider") {
    const rawCategoryId = formData.get("categoryId") as string;
    const categoryId = rawCategoryId ? parseInt(rawCategoryId, 10) : 0;
    const profilePhotoId = formData.get("profilePhotoId") as string;
    const res = await registerProvider(userData, categoryId, profilePhotoId);
    if (res && res.profile_photo_url) {
      profilePhotoUrl = res.profile_photo_url;
    }
  } else {
    await registerConsumer(userData);
  }

  try {
    await getAuthService().updateSession({
      firstName,
      lastName,
      isOnboarded: true,
      role,
      profilePhotoUrl,
    });
    console.log("-> submitRegistration: session updated successfully");
  } catch (error) {
    console.error("Error al actualizar la sesión:", error);
  }

  if (role === "provider") {
    return { redirectTo: ROUTES.provider.home };
  } else {
    return { redirectTo: ROUTES.consumer.home };
  }
}
