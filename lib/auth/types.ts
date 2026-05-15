export interface AppUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AuthSession {
  user: AppUser;
  accessToken?: string;
}

export interface AuthService {
  getSession(): Promise<AuthSession | null>;
}
