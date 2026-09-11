"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";

interface ProfileErrorProps {
  reset: () => void;
}

export default function ProfileError({ reset }: ProfileErrorProps) {
  const copy = t.profile.error;

  const handleRetry = () => {
    reset();
    window.location.reload();
  };

  return (
    <main className="min-h-screen bg-brand-neutral/30 px-6 py-10 font-sans text-brand-primary sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <section
          role="alert"
          aria-labelledby="profile-error-title"
          className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm sm:p-12"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertCircle className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 id="profile-error-title" className="font-heading text-2xl font-bold text-brand-primary">
            {copy.title}
          </h1>
          <p className="mt-2 text-body text-slate-500">{copy.description}</p>
          <div className="mt-6">
            <Button type="button" variant="brandSecondary" onClick={handleRetry}>
              {copy.retry}
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
