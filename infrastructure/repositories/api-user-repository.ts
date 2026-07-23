import { api } from "@/infrastructure/api/base-client";
import { RegisterUserData } from "@/domain/onboarding/types";
import { UserRepository } from "@/ports/user-repository";
import { CurrentUser } from "@/domain/user/types";
import { ApiCurrentUserResponse } from "@/infrastructure/api/types";
import { mapApiToCurrentUser } from "./current-user-mapper";

export class ApiUserRepository implements UserRepository {
  async registerProvider(
    data: RegisterUserData,
    categoryId: number,
    profilePhotoId?: string
  ): Promise<{ profilePhotoUrl?: string }> {
    const res = await api.post<{ profile_photo_url?: string }>("/providers", {
      email: data.email,
      name: data.name,
      surname: data.surname,
      category_id: categoryId,
      profile_photo_file_id: profilePhotoId,
    });
    return { profilePhotoUrl: res.profile_photo_url };
  }

  async registerConsumer(
    data: RegisterUserData,
    profilePhotoFileId?: string
  ): Promise<{ profilePhotoUrl?: string }> {
    const body: Record<string, unknown> = {
      email: data.email,
      name: data.name,
      surname: data.surname,
    };
    if (profilePhotoFileId) {
      body.profile_photo_file_id = profilePhotoFileId;
    }
    const res = await api.post<{ profile_photo_url?: string }>("/consumers", body);
    return { profilePhotoUrl: res?.profile_photo_url };
  }

  async getCurrentUser(): Promise<CurrentUser> {
    const res = await api.get<ApiCurrentUserResponse>("/me");
    return mapApiToCurrentUser(res);
  }
}
