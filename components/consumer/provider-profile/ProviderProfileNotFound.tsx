import Sidebar from "@/components/consumer/Sidebar";
import ConsumerHeader from "@/components/consumer/home/ConsumerHeader";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { t } from "@/infrastructure/i18n/translations";
import { UserX } from "lucide-react";

export default function ProviderProfileNotFound() {
  return (
    <div className="min-h-screen bg-brand-neutral/30 flex font-sans text-brand-primary">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <ConsumerHeader session={null} />

        <main className="flex-1 p-4 sm:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-4xl">
            <section
              aria-labelledby="not-found-title"
              className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <UserX className="h-7 w-7" aria-hidden="true" />
              </div>
              <h1 id="not-found-title" className="text-title font-bold text-brand-primary">
                {t.consumerSearch.profile.notFoundTitle}
              </h1>
              <p className="mt-2 text-body text-slate-500">
                {t.consumerSearch.profile.notFoundDescription}
              </p>
              <div className="mt-6">
                <Link
                  href={ROUTES.consumer.buscar}
                  className="inline-flex items-center justify-center rounded-xl bg-brand-secondary px-5 py-2.5 text-body font-semibold text-white transition-colors hover:bg-brand-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary"
                >
                  {t.consumerSearch.profile.backToSearch}
                </Link>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
