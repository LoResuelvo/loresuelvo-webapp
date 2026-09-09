"use server";

import { ApiUserRepository } from "@/infrastructure/repositories/onboarding/api-user-repository";
import { registerUser } from "@/application/onboarding/register-user";
import { getAuthService } from "@/infrastructure/auth";
import { ConsumerAddress, UserRole } from "@/domain/onboarding/types";
import { ApiClientError } from "@/infrastructure/api/base-client";
import { t } from "@/infrastructure/i18n/translations";

export type RegistrationActionResult =
  | { success: true; redirectTo: string }
  | { success: false; error: string };

const registrationErrorMessages: Record<string, string> = {
  "Address could not be validated": t.onboarding.profileForm.addressValidationFailed,
  "Services are not available in this location": t.onboarding.profileForm.addressOutOfService,
  "Address validation is temporarily unavailable": t.onboarding.profileForm.addressValidationUnavailable,
};

function getRegistrationErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return registrationErrorMessages[error.message] ?? t.onboarding.profileForm.errorSave;
  }

  return t.onboarding.profileForm.errorSave;
}

function getConsumerAddress(formData: FormData): ConsumerAddress {
  const street = formData.get("street");
  const streetNumber = formData.get("streetNumber");
  const floor = formData.get("floor");
  const unit = formData.get("unit");

  return {
    street: typeof street === "string" ? street : "",
    streetNumber: typeof streetNumber === "string" ? streetNumber : "",
    ...(typeof floor === "string" && floor !== "" ? { floor } : {}),
    ...(typeof unit === "string" && unit !== "" ? { unit } : {}),
  };
}

function getProviderRegistrationDetails(formData: FormData) {
  const rawCategoryId = formData.get("categoryId") as string;
  const rawZoneIds = formData.getAll("coverageZoneIds");
  const rawZones = rawZoneIds.length > 0 ? rawZoneIds : formData.getAll("coverageZones");

  return {
    categoryId: rawCategoryId ? parseInt(rawCategoryId, 10) : 0,
    coverageZoneIds: rawZones.length > 0
      ? rawZones.map((zone) => parseInt(zone.toString(), 10)).filter((id) => !isNaN(id))
      : undefined,
  };
}

export async function submitRegistration(formData: FormData): Promise<RegistrationActionResult> {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const rawRole = formData.get("role") as string;
  const role: UserRole = rawRole === "provider" ? "provider" : "consumer";
  const providerDetails = role === "provider" ? getProviderRegistrationDetails(formData) : {};
  const address = role === "consumer" ? getConsumerAddress(formData) : undefined;
  const profilePhotoId = (formData.get("profilePhotoId") as string) || undefined;
  const profilePhotoUrl = (formData.get("profilePhotoUrl") as string) || undefined;

  const userRepo = new ApiUserRepository();
  const authService = getAuthService();

  try {
    const result = await registerUser(userRepo, authService, {
      firstName,
      lastName,
      role,
      ...providerDetails,
      profilePhotoId,
      profilePhotoUrl,
      address,
    });

    return { success: true, ...result };
  } catch (error: unknown) {
    return { success: false, error: getRegistrationErrorMessage(error) };
  }
}
