"use server";

import { ApiUserRepository } from "@/infrastructure/repositories/api-user-repository";
import { getAuthService } from "@/infrastructure/auth";
import { getCurrentUser } from "@/application/user/get-current-user";
import { CurrentUser } from "@/domain/user/types";

export async function getCurrentUserAction(): Promise<CurrentUser> {
  const userRepo = new ApiUserRepository();
  const authService = getAuthService();
  return getCurrentUser(userRepo, authService);
}
