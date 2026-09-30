import type { ProviderCollections } from "@/domain/provider/collections";
import { t } from "@/infrastructure/i18n/translations";
import { statisticsMoney, statisticsRange } from "../statistics/statistics-format";

export function CollectionEvolution({ intervals }: { intervals: ProviderCollections["evolution"] }) {
  const labels = t.providerCollections;
  return <section className="space-y-3" aria-labelledby="collection-evolution-title">
    <h2 id="collection-evolution-title" className="text-xl font-semibold">{labels.evolution}</h2>
    <div tabIndex={0} role="region" aria-label={labels.evolution} aria-describedby="collection-evolution-help" className="overflow-auto max-h-96 rounded-xl border bg-white focus-visible:outline-2 focus-visible:outline-brand-secondary">
      <table aria-label={labels.evolution} className="w-full text-sm">
        <thead><tr className="bg-slate-50 text-left"><th scope="col" className="p-3">{t.providerActivity.interval}</th>{(["bookingDepositCents", "serviceBalanceCents", "totalCents"] as const).map(key => <th scope="col" className="p-3" key={key}>{labels[key]}</th>)}</tr></thead>
        <tbody>{intervals.map(interval => <tr key={interval.from} className="border-t"><th scope="row" className="p-3 text-left font-normal whitespace-nowrap">{statisticsRange(interval.from, interval.to)}</th>{(["bookingDepositCents", "serviceBalanceCents", "totalCents"] as const).map(key => <td className="p-3 whitespace-nowrap" key={key}>{statisticsMoney(interval[key])}</td>)}</tr>)}</tbody>
      </table>
    </div>
  </section>;
}
