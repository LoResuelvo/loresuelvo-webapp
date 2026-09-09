export type UserRole = "consumer" | "provider";

export interface ConsumerAddress {
  readonly street: string;
  readonly streetNumber: string;
  readonly floor?: string;
  readonly unit?: string;
}

export interface RegisterUserData {
  email: string;
  name: string;
  surname: string;
}

export interface RegistrationResult {
  redirectTo: string;
}
