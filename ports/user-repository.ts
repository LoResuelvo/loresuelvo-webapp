import { RegisterUserData } from "@/domain/onboarding/types";

export interface UserRepository {
  registerProvider(
    data: RegisterUserData,
    categoryId: number,
    profilePhotoId?: string
  ): Promise<{ profilePhotoUrl?: string }>;

  registerConsumer(data: RegisterUserData): Promise<void>;
}
