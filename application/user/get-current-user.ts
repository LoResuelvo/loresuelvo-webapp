import { UserRepository } from "@/ports/user-repository";
import { AuthService } from "@/ports/auth-service";
import { CurrentUser } from "@/domain/user/types";

export async function getCurrentUser(
  userRepository: UserRepository,
  authService: AuthService
): Promise<CurrentUser> {
  const session = await authService.getSession();
  if (!session?.accessToken) {
    throw new Error("User is unauthenticated");
  }
  const currentUser = await userRepository.getCurrentUser();

  await authService.updateSession({
    firstName: currentUser.firstName,
    lastName: currentUser.lastName,
    profilePhotoUrl: currentUser.profilePhoto?.url,
    role: currentUser.role,
  });

  return currentUser;
}
