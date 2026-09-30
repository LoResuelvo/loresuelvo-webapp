import type { ProviderCollections } from "@/domain/provider/collections";
import { CalendarDays, Wallet } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";
import { statisticsMoney } from "../statistics/statistics-format";

export function CollectionPending({ pending }: { pending: ProviderCollections["currentPending"] }) {
  const labels = t.providerCollections;
  return <section aria-labelledby="collection-pending-title" className="space-y-4">
    <h2 id="collection-pending-title" className="text-xl font-semibold">{labels.pending}</h2>
    <p className="text-sm text-slate-600">{labels.pendingHelp}</p>
    <div className="grid gap-4 md:grid-cols-2">
      {(["scheduled", "awaitingPayment"] as const).map(key => {
        const scheduled = key === "scheduled";
        const Icon = scheduled ? CalendarDays : Wallet;
        return <div key={key} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${scheduled ? "bg-brand-secondary/10 text-brand-secondary" : "bg-amber-50 text-amber-700"}`}>
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <h3 className="min-w-0 break-words font-semibold text-slate-900">{labels[key]}</h3>
          </div>
          <dl className="mt-4 space-y-4">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <dt className="text-sm text-slate-600">{labels.orders}</dt>
              <dd className="min-w-0 break-words rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold tabular-nums text-slate-900">{pending[key].orders}</dd>
            </div>
            <div className="min-w-0 border-t border-slate-100 pt-4">
              <dt className="text-sm text-slate-600">{labels.amount}</dt>
              <dd className="mt-1 break-words text-3xl font-bold leading-tight tabular-nums tracking-tight text-slate-900">{statisticsMoney(pending[key].amountCents)}</dd>
            </div>
          </dl>
        </div>;
      })}
    </div>
  </section>;
}
