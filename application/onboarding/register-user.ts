import { UserRepository } from "@/ports/user-repository";
import { RegisterUserData, UserRole } from "@/domain/onboarding/types";
import { AuthService } from "@/ports/auth-service";
import { ROUTES } from "@/lib/routes";

interface RegisterUserCommand {
  firstName: string;
  lastName: string;
  role: UserRole;
  categoryId?: number;
  profilePhotoId?: string;
  profilePhotoUrl?: string;
}

export async function registerUser(
  userRepository: UserRepository,
  authService: AuthService,
  command: RegisterUserCommand
): Promise<{ redirectTo: string }> {
  const session = await authService.getSession();
  if (!session) {
    throw new Error("User is unauthenticated");
  }

  const userData: RegisterUserData = {
    email: session.user.email,
    name: command.firstName,
    surname: command.lastName,
  };

  let finalProfilePhotoUrl: string | undefined = undefined;

  if (command.role === "provider") {
    const categoryId = command.categoryId ?? 0;
    await userRepository.registerProvider(userData, categoryId, command.profilePhotoId);
    if (command.profilePhotoUrl) {
      finalProfilePhotoUrl = command.profilePhotoUrl;
    }
  } else {
    const consumerResult = await userRepository.registerConsumer(userData, command.profilePhotoId);
    if (consumerResult?.profilePhotoUrl) {
      finalProfilePhotoUrl = consumerResult.profilePhotoUrl;
    } else if (command.profilePhotoUrl) {
      finalProfilePhotoUrl = command.profilePhotoUrl;
    }
  }

  try {
    await authService.updateSession({
      firstName: command.firstName,
      lastName: command.lastName,
      isOnboarded: true,
      role: command.role,
      profilePhotoUrl: finalProfilePhotoUrl,
    });
  } catch (error) {
    console.error("Error updating session in registerUser use case:", error);
  }

  return {
    redirectTo: command.role === "provider" ? ROUTES.provider.home : ROUTES.consumer.home,
  };
}
