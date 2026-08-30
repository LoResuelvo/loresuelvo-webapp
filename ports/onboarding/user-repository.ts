import { RegisterUserData } from "@/domain/onboarding/types";
import { CurrentUser } from "@/domain/user/types";

export interface UserRepository {
  registerProvider(
    data: RegisterUserData,
    categoryId: number,
    profilePhotoId?: string
  ): Promise<{ profilePhotoUrl?: string }>;

  registerConsumer(
    data: RegisterUserData,
    profilePhotoFileId?: string
  ): Promise<{ profilePhotoUrl?: string }>;

  getCurrentUser(): Promise<CurrentUser>;
}

