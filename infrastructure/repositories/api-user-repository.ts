import { api } from "@/infrastructure/api/base-client";
import { RegisterUserData } from "@/domain/onboarding/types";
import { UserRepository } from "@/ports/user-repository";

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

  async registerConsumer(data: RegisterUserData): Promise<void> {
    return api.post<void>("/consumers", {
      email: data.email,
      name: data.name,
      surname: data.surname,
    });
  }
}
