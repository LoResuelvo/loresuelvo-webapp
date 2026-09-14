import { UserRepository } from "@/ports/onboarding/user-repository";
import { AuthService } from "@/ports/onboarding/auth-service";
import { CurrentUser } from "@/domain/user/types";

export async function getCurrentUser(
  userRepository: UserRepository,
  authService: AuthService
): Promise<CurrentUser> {
  const session = await authService.getSession();
  if (!session?.accessToken) {
    throw new Error("User is unauthenticated");
  }

  return userRepository.getCurrentUser();
}
