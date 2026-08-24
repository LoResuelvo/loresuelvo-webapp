import Sidebar from "@/components/consumer/Sidebar";
import ConsumerHeader from "@/components/consumer/home/ConsumerHeader";
import { t } from "@/infrastructure/i18n/translations";

export default function ProviderProfileSkeleton() {
  return (
    <div
      data-testid="provider-profile-skeleton"
      aria-busy="true"
      aria-live="polite"
      className="min-h-screen bg-brand-neutral/30 flex font-sans text-brand-primary"
    >
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <ConsumerHeader session={null} />

        <main className="flex-1 p-4 sm:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-4xl">
            <div className="mb-6 h-6 w-32 rounded bg-slate-200 animate-pulse" />

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 animate-pulse">
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                <div className="h-24 w-24 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div className="h-4 w-28 rounded bg-slate-200 mx-auto sm:mx-0" />
                  <div className="h-7 w-48 rounded bg-slate-200 mx-auto sm:mx-0" />
                  <div className="h-4 w-36 rounded bg-slate-200 mx-auto sm:mx-0" />
                </div>
              </div>
              <span className="sr-only">{t.consumerSearch.profile.loading}</span>
            </section>
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 animate-pulse">
              <div className="h-5 w-32 rounded bg-slate-200" />
              <div className="mt-5 h-8 w-48 rounded bg-slate-200" />
            </section>
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 animate-pulse">
              <div className="h-5 w-48 rounded bg-slate-200" />
              <div className="mt-5 h-20 rounded-xl bg-slate-200" />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
