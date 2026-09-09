import { ConsumerAddress, RegisterUserData } from "@/domain/onboarding/types";
import { CurrentUser } from "@/domain/user/types";

export interface UserRepository {
  registerProvider(
    data: RegisterUserData,
    categoryId: number,
    profilePhotoId?: string,
    coverageZoneIds?: number[]
  ): Promise<{ profilePhotoUrl?: string }>;

  registerConsumer(
    data: RegisterUserData,
    profilePhotoFileId: string | undefined,
    address: ConsumerAddress
  ): Promise<{ profilePhotoUrl?: string }>;

  getCurrentUser(): Promise<CurrentUser>;
}
