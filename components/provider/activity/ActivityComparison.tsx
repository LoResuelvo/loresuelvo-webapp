import type { ActivityComparison as Comparison, ActivityMetric } from "@/domain/provider/activity";
import { t } from "@/infrastructure/i18n/translations";
import { activityMoney, activityRange } from "./activity-format";

const metrics: ActivityMetric[] = ["confirmedBookings", "reportedCompletions", "fullyPaidWorkOrders", "clientsServed", "newClients", "returningClients", "agreedValueCents", "averageValueCents"];

function value(metric: ActivityMetric, amount: number | null): string {
  if (metric === "agreedValueCents" || metric === "averageValueCents") return activityMoney(amount);
  return amount === null ? t.providerActivity.unavailable : String(amount);
}

function percentage(amount: number | null): string {
  if (amount === null) return t.providerActivity.unavailable;
  return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(amount)} %`;
}

export function ActivityComparison({ comparison }: { comparison: Comparison }) {
  const labels = t.providerActivity;
  return (
    <section aria-labelledby="activity-comparison-title" className="space-y-3 min-w-0">
      <h2 id="activity-comparison-title" className="text-xl font-semibold">{labels.comparison}</h2>
      <p>{labels.previousPeriod}: {activityRange(comparison.period.from, comparison.period.to)}</p>
      <p className="text-sm text-slate-600">{labels.percentageHelp}</p>
      <div role="region" aria-label={labels.comparison} tabIndex={0} className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <caption className="sr-only">{labels.comparison}</caption>
          <thead className="bg-slate-50 text-left"><tr>{[labels.metric, labels.previousValue, labels.absoluteChange, labels.percentageChange].map(label => <th key={label} scope="col" className="p-3">{label}</th>)}</tr></thead>
          <tbody>{metrics.map(metric => <tr key={metric} className="border-t border-slate-100">
            <th scope="row" className="p-3 text-left font-normal">{labels[metric]}</th>
            <td className="p-3 whitespace-nowrap tabular-nums">{value(metric, comparison.results[metric])}</td>
            <td className="p-3 whitespace-nowrap tabular-nums">{value(metric, comparison.changes[metric].absolute)}</td>
            <td className="p-3 whitespace-nowrap tabular-nums">{percentage(comparison.changes[metric].percentage)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
