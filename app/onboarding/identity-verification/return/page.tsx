"use client";

import { IdentityVerificationResult } from "@/components/onboarding/IdentityVerificationResult";
import { useIdentityVerificationStatus } from "@/components/onboarding/useIdentityVerificationStatus";
import { readIdentityVerificationStatusAction } from "@/app/onboarding/identity-status-actions";

export default function IdentityVerificationReturnPage() {
  const identity = useIdentityVerificationStatus({
    readStatus: readIdentityVerificationStatusAction,
    pollPending: true,
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-neutral p-4 font-sans text-brand-primary">
      <div className="w-full max-w-[440px] rounded-2xl border border-border bg-white p-8 shadow-sm">
        <IdentityVerificationResult
          status={identity.status}
          isLoading={identity.isLoading}
          isRefreshing={identity.isRefreshing}
          timedOut={identity.timedOut}
          error={identity.error}
          onRefresh={identity.refresh}
        />
      </div>
    </main>
  );
}
