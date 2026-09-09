import { api } from "@/infrastructure/api/base-client";
import { RegisterUserData } from "@/domain/onboarding/types";
import { UserRepository } from "@/ports/onboarding/user-repository";
import { CurrentUser } from "@/domain/user/types";
import { ConsumerAddress } from "@/domain/onboarding/types";
import { ApiCurrentUserResponse, ApiRegisterConsumerRequest, ApiRegisterConsumerResponse } from "@/infrastructure/api/types";
import { mapApiToCurrentUser } from "./current-user-mapper";

export class ApiUserRepository implements UserRepository {
  async registerProvider(
    data: RegisterUserData,
    categoryId: number,
    profilePhotoId?: string,
    coverageZoneIds?: number[]
  ): Promise<{ profilePhotoUrl?: string }> {
    const res = await api.post<{ profile_photo_url?: string }>("/providers", {
      email: data.email,
      name: data.name,
      surname: data.surname,
      category_id: categoryId,
      profile_photo_file_id: profilePhotoId,
      coverage_zone_ids: coverageZoneIds || [],
    });
    return { profilePhotoUrl: res.profile_photo_url };
  }

  async registerConsumer(
    data: RegisterUserData,
    profilePhotoFileId: string | undefined,
    address: ConsumerAddress
  ): Promise<{ profilePhotoUrl?: string }> {
    const body: ApiRegisterConsumerRequest = {
      email: data.email,
      name: data.name,
      surname: data.surname,
      address: {
        street: address.street,
        street_number: address.streetNumber,
        ...(address.floor !== undefined ? { floor: address.floor } : {}),
        ...(address.unit !== undefined ? { unit: address.unit } : {}),
      },
    };
    if (profilePhotoFileId) {
      body.profile_photo_file_id = profilePhotoFileId;
    }
    const res = await api.post<ApiRegisterConsumerResponse>("/consumers", body);
    return { profilePhotoUrl: res?.profile_photo_url };
  }

  async getCurrentUser(): Promise<CurrentUser> {
    const res = await api.get<ApiCurrentUserResponse>("/me");
    return mapApiToCurrentUser(res);
  }
}
