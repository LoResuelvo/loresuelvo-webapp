import { ProviderModule } from "@/domain/provider/Provider";
import type { Provider } from "@/domain/provider/types";
import type { AuthSession } from "@/infrastructure/auth/types";
import { t } from "@/infrastructure/i18n/translations";
import { Avatar } from "@/components/ui/avatar";
import Sidebar from "@/components/consumer/Sidebar";
import ConsumerHeader from "@/components/consumer/home/ConsumerHeader";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

interface ProviderProfileViewProps {
  provider: Provider;
  session: AuthSession | null;
}

export default function ProviderProfileView({ provider, session }: ProviderProfileViewProps) {
  const displayName = ProviderModule.getDisplayName(provider);

  return (
    <div className="min-h-screen bg-brand-neutral/30 flex font-sans text-brand-primary">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <ConsumerHeader session={session} />

        <main className="flex-1 p-4 sm:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-4xl">
            <Link
              href={ROUTES.consumer.home}
              className="mb-6 inline-flex rounded-lg px-1 py-2 text-body font-semibold text-brand-secondary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary"
            >
              ← {t.consumerSearch.header.backTitle}
            </Link>

            <section
              aria-labelledby="provider-profile-title"
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10"
            >
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                <Avatar
                  src={provider.profilePhotoUrl}
                  alt={`${t.consumerSearch.profile.photoAlt} ${displayName}`}
                  size="xl"
                  initials={ProviderModule.getInitials(provider)}
                  imgTestId="provider-profile-photo"
                />

                <div className="min-w-0 text-center sm:text-left">
                  <p className="text-small font-semibold uppercase tracking-wide text-brand-secondary">
                    {t.consumerSearch.profile.title}
                  </p>
                  <h1 id="provider-profile-title" className="mt-1 break-words text-title font-bold text-brand-primary">
                    {displayName}
                  </h1>
                  <p className="mt-3 text-body text-slate-500">
                    <span className="font-semibold text-slate-700">
                      {t.consumerSearch.profile.categoryLabel}:
                    </span>{" "}
                    {provider.categoryName}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
