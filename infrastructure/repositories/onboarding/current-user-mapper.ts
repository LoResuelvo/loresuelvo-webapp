import {
  ApiCurrentUserResponse,
  ApiProviderCurrentUserResponse,
} from "@/infrastructure/api/types";
import { IdentityVerificationError } from "@/domain/identity-verification/errors";
import {
  isIdentityVerificationStatus,
  IdentityVerificationStatus,
} from "@/domain/identity-verification/types";
import { CurrentUser, ProviderCurrentUser } from "@/domain/user/types";

function mapIdentityVerificationStatus(value: unknown): IdentityVerificationStatus {
  if (!isIdentityVerificationStatus(value)) {
    throw new IdentityVerificationError("invalid_response");
  }

  return value;
}

function mapNullableIsoTimestamp(value: unknown): string | null {
  if (value === null) {
    return null;
  }

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new IdentityVerificationError("invalid_response");
  }

  return value;
}

export function mapApiToCurrentUser(api: ApiCurrentUserResponse): CurrentUser {
  const base: CurrentUser = {
    id: api.id,
    firstName: api.name,
    lastName: api.surname,
    email: api.email,
    role: api.role,
    calendarConnectionStatus: api.calendar_connection_status,
    profilePhoto: api.profile_photo
      ? { originalName: api.profile_photo.original_name, url: api.profile_photo.url }
      : null,
  };

  if (api.role === "provider") {
    const providerApi: ApiProviderCurrentUserResponse = api;
    const result: ProviderCurrentUser = {
      ...base,
      role: "provider",
      category: {
        id: providerApi.category.id,
        name: providerApi.category.name,
      },
      identityVerificationStatus: mapIdentityVerificationStatus(
        providerApi.identity_verification_status,
      ),
      identityVerifiedOn: mapNullableIsoTimestamp(providerApi.identity_verified_on),
    };
    return result;
  }

  return base;
}
