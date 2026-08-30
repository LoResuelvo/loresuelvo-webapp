import {
  ApiCurrentUserResponse,
  ApiProviderCurrentUserResponse
} from "@/infrastructure/api/types";
import { CurrentUser, ProviderCurrentUser } from "@/domain/user/types";

export function mapApiToCurrentUser(api: ApiCurrentUserResponse): CurrentUser {
  const base: CurrentUser = {
    id: api.id,
    firstName: api.name,
    lastName: api.surname,
    email: api.email,
    role: api.role,
    profilePhoto: api.profile_photo
      ? { originalName: api.profile_photo.original_name, url: api.profile_photo.url }
      : null,
  };

  if (api.role === "provider") {
    const providerApi = api as ApiProviderCurrentUserResponse;
    const result: ProviderCurrentUser = {
      ...base,
      role: "provider",
      category: {
        id: providerApi.category.id,
        name: providerApi.category.name,
      },
    };
    return result;
  }

  return base;
}
