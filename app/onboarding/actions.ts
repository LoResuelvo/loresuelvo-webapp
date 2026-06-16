"use server";

import { ApiUserRepository } from "@/infrastructure/repositories/api-user-repository";
import { ApiFileRepository } from "@/infrastructure/repositories/api-file-repository";
import { registerUser } from "@/application/onboarding/register-user";
import { getPresignedUrl, confirmUpload } from "@/application/onboarding/upload-profile-photo";
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

  if (role === "provider") {
    const rawCategoryId = formData.get("categoryId") as string;
    categoryId = rawCategoryId ? parseInt(rawCategoryId, 10) : 0;
    profilePhotoId = (formData.get("profilePhotoId") as string) || undefined;
    profilePhotoUrl = (formData.get("profilePhotoUrl") as string) || undefined;
  }

  const userRepo = new ApiUserRepository();
  const authService = getAuthService();

  return registerUser(userRepo, authService, {
    firstName,
    lastName,
    role,
    categoryId,
    profilePhotoId,
    profilePhotoUrl,
  });
}

export async function getPresignedUrlAction(
  originalName: string,
  mimeType: string,
  sizeBytes: number,
  purpose: string
) {
  const fileRepo = new ApiFileRepository();
  const authService = getAuthService();
  return getPresignedUrl(fileRepo, authService, originalName, mimeType, sizeBytes, purpose);
}

export async function confirmUploadAction(
  fileId: string,
  key: string,
  mimeType: string,
  sizeBytes: number
) {
  const fileRepo = new ApiFileRepository();
  const authService = getAuthService();
  return confirmUpload(fileRepo, authService, fileId, key, mimeType, sizeBytes);
}
