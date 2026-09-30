import type { ProviderCollections } from "@/domain/provider/collections";
import { t } from "@/infrastructure/i18n/translations";
import { statisticsMoney } from "../statistics/statistics-format";

export function CollectionPending({ pending }: { pending: ProviderCollections["currentPending"] }) {
  const labels = t.providerCollections;
  return <section aria-labelledby="collection-pending-title" className="rounded-xl bg-slate-100 p-4 space-y-3">
    <h2 id="collection-pending-title" className="text-xl font-semibold">{labels.pending}</h2>
    <p className="text-sm text-slate-600">{labels.pendingHelp}</p>
    <div className="grid gap-4 sm:grid-cols-2">{(["scheduled", "awaitingPayment"] as const).map(key => <div key={key}>
      <h3 className="font-semibold">{labels[key]}</h3><dl className="mt-2 space-y-2"><div><dt>{labels.orders}</dt><dd className="text-xl font-bold">{pending[key].orders}</dd></div><div><dt>{labels.amount}</dt><dd className="text-xl font-bold">{statisticsMoney(pending[key].amountCents)}</dd></div></dl>
    </div>)}</div>
  </section>;
}
