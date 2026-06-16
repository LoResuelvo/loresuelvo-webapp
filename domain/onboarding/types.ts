export type UserRole = "consumer" | "provider";

export interface RegisterUserData {
  email: string;
  name: string;
  surname: string;
}

export interface RegistrationResult {
  redirectTo: string;
}
