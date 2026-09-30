import type { CollectionComparison as Comparison } from "@/domain/provider/collections";
import { t } from "@/infrastructure/i18n/translations";
import { statisticsMoney, statisticsRange } from "../statistics/statistics-format";

export function CollectionComparison({ comparison }: { comparison: Comparison }) {
  const labels = t.providerActivity;
  return <section aria-labelledby="collection-comparison-title" className="space-y-3">
    <h2 id="collection-comparison-title" className="text-xl font-semibold">{labels.comparison}</h2>
    <p>{labels.previousPeriod}: {statisticsRange(comparison.period.from, comparison.period.to)}</p>
    <p className="text-sm text-slate-600">{labels.percentageHelp}</p>
    <div tabIndex={0} role="region" aria-label={t.providerCollections.comparison} className="overflow-auto rounded-xl border bg-white focus-visible:outline-2 focus-visible:outline-brand-secondary">
      <table aria-label={t.providerCollections.comparison} className="w-full text-sm">
        <thead><tr className="bg-slate-50 text-left">{[labels.metric, labels.previousValue, labels.absoluteChange, labels.percentageChange].map(label => <th scope="col" className="p-3" key={label}>{label}</th>)}</tr></thead>
        <tbody>{(["bookingDepositCents", "serviceBalanceCents", "totalCents"] as const).map(key => <tr key={key} className="border-t">
          <th scope="row" className="p-3 text-left">{t.providerCollections[key]}</th>
          <td className="p-3 whitespace-nowrap">{statisticsMoney(comparison.results[key])}</td>
          <td className="p-3 whitespace-nowrap">{statisticsMoney(comparison.changes[key].absolute)}</td>
          <td className="p-3 whitespace-nowrap">{comparison.changes[key].percentage === null ? labels.unavailable : `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(comparison.changes[key].percentage)} %`}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}
