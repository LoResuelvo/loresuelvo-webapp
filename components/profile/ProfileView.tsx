import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import type { CurrentUser } from "@/domain/user/types";
import { t } from "@/infrastructure/i18n/translations";
import GoogleCalendarConnectionCard from "./GoogleCalendarConnectionCard";

interface ProfileViewProps {
  user: CurrentUser;
}

export default function ProfileView({ user }: ProfileViewProps) {
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const initials = user.firstName.charAt(0).toUpperCase();

  return (
    <main className="min-h-screen bg-brand-neutral/30 px-6 py-10 font-sans text-brand-primary sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="space-y-2">
          <h1 className="font-heading text-3xl font-bold">{t.profile.title}</h1>
          <p className="text-body text-slate-600">{t.profile.description}</p>
        </header>

        <Card>
          <CardContent className="flex items-center gap-4">
            <Avatar
              src={user.profilePhoto?.url}
              alt={`${t.profile.photoAlt} ${fullName}`}
              size="lg"
              initials={initials}
            />
            <div className="min-w-0">
              <p className="text-small font-semibold uppercase tracking-wide text-slate-500">
                {t.profile.nameLabel}
              </p>
              <h2 className="truncate font-heading text-xl font-semibold">{fullName}</h2>
              <p className="truncate text-body text-slate-600">{user.email}</p>
            </div>
          </CardContent>
        </Card>

        <GoogleCalendarConnectionCard status={user.calendarConnectionStatus} />
      </div>
    </main>
  );
}
