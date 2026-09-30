import type { CollectionAmounts } from "@/domain/provider/collections";
import { t } from "@/infrastructure/i18n/translations";
import { statisticsMoney } from "../statistics/statistics-format";

export function CollectionResults({ results }: { results: CollectionAmounts }) {
  const labels = t.providerCollections;
  return <section aria-labelledby="collection-results-title" className="space-y-3">
    <h2 id="collection-results-title" className="text-xl font-semibold">{labels.results}</h2>
    <p className="text-sm text-slate-600">{labels.valueHelp}</p>
    <dl className="grid gap-4 lg:grid-cols-3">
      {(["bookingDepositCents", "serviceBalanceCents", "totalCents"] as const).map(key => <div key={key} className="rounded-xl border border-slate-200 bg-white p-4 min-w-0">
        <dt className="text-sm text-slate-600">{labels[key]}</dt><dd className="mt-2 text-2xl font-bold break-words">{statisticsMoney(results[key])}</dd>
      </div>)}
    </dl>
  </section>;
}
