import type { ActivityInterval } from "@/domain/provider/activity";
import { t } from "@/infrastructure/i18n/translations";
import { activityRange } from "./activity-format";
import { ActivityEvolutionChart } from "./ActivityEvolutionChart";

export function ActivityEvolution({ intervals }: { intervals: readonly ActivityInterval[] }) {
  const labels = t.providerActivity;
  return (
    <section className="min-w-0 space-y-3" aria-labelledby="activity-evolution-title">
      <h2 id="activity-evolution-title" className="text-xl font-semibold">{labels.evolution}</h2>
      <ActivityEvolutionChart intervals={intervals} />
      <div className="max-h-96 overflow-auto rounded-xl border border-slate-200 bg-white" tabIndex={0} role="region" aria-label={labels.evolution}>
        <table className="w-full text-sm">
          <caption className="sr-only">{labels.evolution}</caption>
          <thead className="bg-slate-50 text-left"><tr>
            {[labels.interval, labels.confirmedBookings, labels.reportedCompletions, labels.fullyPaidWorkOrders].map(label => <th key={label} scope="col" className="px-4 py-3">{label}</th>)}
          </tr></thead>
          <tbody>{intervals.map(interval => <tr key={interval.from} className="border-t border-slate-100">
            <th scope="row" className="px-4 py-3 text-left font-normal whitespace-nowrap">{activityRange(interval.from, interval.to)}</th>
            <td className="px-4 py-3 tabular-nums">{interval.confirmedBookings}</td>
            <td className="px-4 py-3 tabular-nums">{interval.reportedCompletions}</td>
            <td className="px-4 py-3 tabular-nums">{interval.fullyPaidWorkOrders}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
