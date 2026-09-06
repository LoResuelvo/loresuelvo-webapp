"use server";

import { ApiUserRepository } from "@/infrastructure/repositories/onboarding/api-user-repository";
import { registerUser } from "@/application/onboarding/register-user";
import { getAuthService } from "@/infrastructure/auth";
import { UserRole } from "@/domain/onboarding/types";

export async function submitRegistration(formData: FormData) {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const rawRole = formData.get("role") as string;
  const role: UserRole = rawRole === "provider" ? "provider" : "consumer";
  
  let categoryId: number | undefined = undefined;
  let profilePhotoId: string | undefined = undefined;
  let profilePhotoUrl: string | undefined = undefined;
  let coverageZoneIds: number[] | undefined = undefined;

  if (role === "provider") {
    const rawCategoryId = formData.get("categoryId") as string;
    categoryId = rawCategoryId ? parseInt(rawCategoryId, 10) : 0;
    const rawZoneIds = formData.getAll("coverageZoneIds");
    const rawZones = rawZoneIds.length > 0 ? rawZoneIds : formData.getAll("coverageZones");
    if (rawZones.length > 0) {
      coverageZoneIds = rawZones
        .map((z) => parseInt(z.toString(), 10))
        .filter((id) => !isNaN(id));
    }
  }

  profilePhotoId = (formData.get("profilePhotoId") as string) || undefined;
  profilePhotoUrl = (formData.get("profilePhotoUrl") as string) || undefined;

  const userRepo = new ApiUserRepository();
  const authService = getAuthService();

  return registerUser(userRepo, authService, {
    firstName,
    lastName,
    role,
    categoryId,
    profilePhotoId,
    profilePhotoUrl,
    coverageZoneIds,
  });
}


