import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import type { CurrentUser } from "@/domain/user/types";
import type { PaymentAccountConnection } from "@/domain/payment-account/types";
import { t } from "@/infrastructure/i18n/translations";
import type { MercadoPagoCallbackResult } from "@/app/profile/mercado-pago-result";
import type { CalendarCallbackResult } from "@/app/profile/calendar-result";
import CalendarConnectionFeedback from "./CalendarConnectionFeedback";
import GoogleCalendarConnectionCard from "./GoogleCalendarConnectionCard";
import MercadoPagoConnectionCard from "./MercadoPagoConnectionCard";

interface ProfileViewProps {
  user: CurrentUser;
  calendarResult?: CalendarCallbackResult | null;
  paymentAccountConnection: PaymentAccountConnection | null;
  mercadoPagoResult?: MercadoPagoCallbackResult | null;
}

export default function ProfileView({
  user,
  calendarResult,
  paymentAccountConnection,
  mercadoPagoResult,
}: ProfileViewProps) {
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const initials = user.firstName.charAt(0).toUpperCase();

  return (
    <main className="min-w-0 w-full flex-1 bg-brand-neutral/30 px-4 py-8 font-sans text-brand-primary sm:px-8 sm:py-10 lg:px-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="space-y-2">
          <h1 className="font-heading text-3xl font-bold">{t.profile.title}</h1>
          <p className="text-body text-slate-600">{t.profile.description}</p>
        </header>

        <CalendarConnectionFeedback
          result={calendarResult}
          status={user.calendarConnectionStatus}
        />

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
              <h2 className="break-words font-heading text-xl font-semibold">{fullName}</h2>
              <p className="break-all text-body text-slate-600">{user.email}</p>
            </div>
          </CardContent>
        </Card>

        {user.role === "consumer" && (
          <section aria-labelledby="profile-address-title" className="space-y-4">
            <h2 id="profile-address-title" className="font-heading text-xl font-semibold">
              {t.profile.addressTitle}
            </h2>
            <Card>
              <CardContent>
                {user.address ? (
                  <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <dt className="text-small font-semibold uppercase tracking-wide text-slate-500">
                        {t.profile.streetLabel}
                      </dt>
                      <dd className="break-words text-body">{user.address.street}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-small font-semibold uppercase tracking-wide text-slate-500">
                        {t.profile.streetNumberLabel}
                      </dt>
                      <dd className="break-words text-body">{user.address.streetNumber}</dd>
                    </div>
                    {user.address.floor && (
                      <div className="space-y-1">
                        <dt className="text-small font-semibold uppercase tracking-wide text-slate-500">
                          {t.profile.floorLabel}
                        </dt>
                        <dd className="break-words text-body">{user.address.floor}</dd>
                      </div>
                    )}
                    {user.address.unit && (
                      <div className="space-y-1">
                        <dt className="text-small font-semibold uppercase tracking-wide text-slate-500">
                          {t.profile.unitLabel}
                        </dt>
                        <dd className="break-words text-body">{user.address.unit}</dd>
                      </div>
                    )}
                  </dl>
                ) : (
                  <p className="text-body text-slate-600">{t.profile.addressMissing}</p>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        <section aria-labelledby="profile-integrations-title" className="space-y-4">
          <h2 id="profile-integrations-title" className="font-heading text-xl font-semibold">
            {t.profile.integrationsTitle}
          </h2>
          <GoogleCalendarConnectionCard status={user.calendarConnectionStatus} />
          {user.role === "provider" && (
            <MercadoPagoConnectionCard
              connection={paymentAccountConnection}
              callbackResult={mercadoPagoResult}
            />
          )}
        </section>
      </div>
    </main>
  );
}
