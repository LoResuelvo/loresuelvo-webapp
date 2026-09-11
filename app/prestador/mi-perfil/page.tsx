import ProfileView from "@/components/profile/ProfileView";
import { getAuthenticatedProfile } from "@/app/profile/profile-page-data";

export default async function ProviderProfilePage() {
  const user = await getAuthenticatedProfile();

  return <ProfileView user={user} />;
}
