import { t } from "@/infrastructure/i18n/translations";

export const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024;
export const VALID_PHOTO_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  categoryId?: string;
  profilePhoto?: string;
}

export function validateProfileForm(
  firstName: string,
  lastName: string,
  role: "consumer" | "provider" | null,
  categoryId?: string,
  profilePhotoSize?: number,
  profilePhotoName?: string,
  profilePhotoType?: string
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};
  let isValid = true;

  if (!firstName || firstName.trim() === "") {
    errors.firstName = t.onboarding.profileForm.requiredField;
    isValid = false;
  }

  if (!lastName || lastName.trim() === "") {
    errors.lastName = t.onboarding.profileForm.requiredField;
    isValid = false;
  }

  if (role === "provider") {
    if (!categoryId || categoryId === "") {
      errors.categoryId = t.onboarding.profileForm.requiredCategory;
      isValid = false;
    }

    if (profilePhotoSize === undefined || (profilePhotoSize === 0 && profilePhotoName === "")) {
      errors.profilePhoto = t.onboarding.profileForm.photoRequired;
      isValid = false;
    } else if (profilePhotoType && !VALID_PHOTO_TYPES.includes(profilePhotoType)) {
      errors.profilePhoto = t.onboarding.profileForm.photoInvalidFormat;
      isValid = false;
    } else if (profilePhotoSize && profilePhotoSize > MAX_PROFILE_PHOTO_SIZE) {
      errors.profilePhoto = t.onboarding.profileForm.photoTooLarge;
      isValid = false;
    }
  }

  return { isValid, errors };
}

export function validateProfilePhoto(file: { size: number; type: string } | null): string | null {
  if (!file) return null;
  if (!VALID_PHOTO_TYPES.includes(file.type)) {
    return t.onboarding.profileForm.photoInvalidFormat;
  }
  if (file.size > MAX_PROFILE_PHOTO_SIZE) {
    return t.onboarding.profileForm.photoTooLarge;
  }
  return null;
}
