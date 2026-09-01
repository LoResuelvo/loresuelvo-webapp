import { t } from "@/infrastructure/i18n/translations";

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export interface ValidationResult {
  validFiles: File[];
  error: string | null;
}

export function validateImageFiles(files: File[]): ValidationResult {
  let sizeError = false;
  let formatError = false;

  const validFiles = files.filter((file) => {
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      sizeError = true;
      return false;
    }
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
      formatError = true;
      return false;
    }
    return true;
  });

  if (sizeError) {
    return { validFiles, error: t.messaging.fileTooLarge };
  }
  if (formatError) {
    return { validFiles, error: t.messaging.photoInvalidFormat };
  }
  return { validFiles, error: null };
}
