export interface AppUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isOnboarded?: boolean;
  role?: "consumer" | "provider";
  profilePhotoUrl?: string;
}

export interface AuthSession {
  user: AppUser;
  accessToken?: string;
}

export interface AuthService {
  getSession(): Promise<AuthSession | null>;
  updateSession(userUpdate: Partial<AppUser>): Promise<void>;
}
