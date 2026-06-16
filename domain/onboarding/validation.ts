export const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024;
export const VALID_PHOTO_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  categoryId?: string;
  profilePhoto?: string;
}

export interface ProfileFormMessages {
  requiredField: string;
  requiredCategory: string;
  photoRequired: string;
  photoInvalidFormat: string;
  photoTooLarge: string;
}

const defaultMessages: ProfileFormMessages = {
  requiredField: "Campo obligatorio",
  requiredCategory: "Debe seleccionar un rubro",
  photoRequired: "La foto de perfil es obligatoria",
  photoInvalidFormat: "Formato de imagen no permitido. Los formatos permitidos son: PNG, JPG, JPEG y WEBP",
  photoTooLarge: "La imagen no debe superar los 5MB",
};

export function validateProfileForm(
  firstName: string,
  lastName: string,
  role: "consumer" | "provider" | null,
  categoryId?: string,
  profilePhotoSize?: number,
  profilePhotoName?: string,
  profilePhotoType?: string,
  messages?: Partial<ProfileFormMessages>
): { isValid: boolean; errors: ValidationErrors } {
  const msg = { ...defaultMessages, ...messages };
  const errors: ValidationErrors = {};
  let isValid = true;

  if (!firstName || firstName.trim() === "") {
    errors.firstName = msg.requiredField;
    isValid = false;
  }

  if (!lastName || lastName.trim() === "") {
    errors.lastName = msg.requiredField;
    isValid = false;
  }

  if (role === "provider") {
    if (!categoryId || categoryId === "") {
      errors.categoryId = msg.requiredCategory;
      isValid = false;
    }

    if (profilePhotoSize === undefined || (profilePhotoSize === 0 && profilePhotoName === "")) {
      errors.profilePhoto = msg.photoRequired;
      isValid = false;
    } else if (profilePhotoType && !VALID_PHOTO_TYPES.includes(profilePhotoType)) {
      errors.profilePhoto = msg.photoInvalidFormat;
      isValid = false;
    } else if (profilePhotoSize && profilePhotoSize > MAX_PROFILE_PHOTO_SIZE) {
      errors.profilePhoto = msg.photoTooLarge;
      isValid = false;
    }
  }

  return { isValid, errors };
}

export function validateProfilePhoto(
  file: { size: number; type: string } | null,
  messages?: Partial<Pick<ProfileFormMessages, "photoInvalidFormat" | "photoTooLarge">>
): string | null {
  if (!file) return null;
  const msg = { ...defaultMessages, ...messages };
  if (!VALID_PHOTO_TYPES.includes(file.type)) {
    return msg.photoInvalidFormat;
  }
  if (file.size > MAX_PROFILE_PHOTO_SIZE) {
    return msg.photoTooLarge;
  }
  return null;
}
