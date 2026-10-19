import { createClaimAction, getClaimDetailAction, listClaimReferencesAction, listClaimsAction } from "@/app/claims/actions";
import ProviderHeader from "@/components/provider/home/layout/ProviderHeader";
import ProviderSidebar from "@/components/provider/home/layout/ProviderSidebar";
import { ParticipantClaimsWorkspace } from "@/components/claims/ParticipantClaimsWorkspace";
import { getAuthService } from "@/infrastructure/auth";
import { t } from "@/infrastructure/i18n/translations";
import { ROUTES } from "@/lib/routes";
import { redirect } from "next/navigation";

export default async function ProviderClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ operation?: string | string[] }>;
}) {
  const session = await getAuthService().getSession();
  if (session?.user.role !== "provider") {
    redirect(session?.user.role === "consumer" ? ROUTES.consumer.claims : ROUTES.auth.login);
  }
  const { operation: operationParam } = await searchParams;
  const operation = typeof operationParam === "string" ? operationParam : undefined;
  const orderIdMatch = operation?.match(/^work_order:([1-9][0-9]*)$/);
  const candidateOrderId = orderIdMatch ? Number(orderIdMatch[1]) : undefined;
  const workOrderId = candidateOrderId && candidateOrderId <= 2147483647 ? candidateOrderId : undefined;
  const referencesResult = await listClaimReferencesAction(workOrderId);
  const initialReference = referencesResult.ok && referencesResult.data.some((option) => option.value === operation)
    ? operation
    : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-brand-neutral/30 font-sans text-brand-primary md:flex-row">
      <ProviderSidebar responsive />
      <div className="flex min-w-0 flex-1 flex-col">
        <ProviderHeader session={session} />
        <main className="flex-1 p-5 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-4xl space-y-6">
            <header className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-brand-primary sm:text-3xl">{t.claims.title}</h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{t.claims.intro}</p>
            </header>
            <ParticipantClaimsWorkspace
              references={referencesResult.ok ? referencesResult.data : []}
              initialReference={initialReference}
              referencesError={!referencesResult.ok ? referencesResult.error : undefined}
              onCreateClaim={createClaimAction}
              onListClaims={listClaimsAction}
              onGetClaim={getClaimDetailAction}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
