export interface CurrentUserProfilePhoto {
  originalName: string;
  url: string;
}

export interface CurrentUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "consumer" | "provider";
  profilePhoto?: CurrentUserProfilePhoto | null;
}

export interface ConsumerCurrentUser extends CurrentUser {
  role: "consumer";
}

export interface ProviderCurrentUser extends CurrentUser {
  role: "provider";
  category: {
    id: number;
    name: string;
  };
}
