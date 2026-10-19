import Link from "next/link";
import type { ClaimReference } from "@/domain/claim/types";
import { ROUTES } from "@/lib/routes";
import { t } from "@/infrastructure/i18n/translations";

export function ClaimOperationLink({ reference, isConsumer }: {
  reference: ClaimReference;
  isConsumer: boolean;
}) {
  const route = isConsumer ? ROUTES.consumer.claims : ROUTES.provider.claims;
  const query = new URLSearchParams({ operation: `${reference.kind}:${reference.id}` });
  return (
    <Link href={`${route}?${query}`} className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-brand-primary hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary">
      {t.claims.startClaim}
    </Link>
  );
}
