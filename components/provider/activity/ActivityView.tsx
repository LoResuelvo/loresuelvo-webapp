import type { ProviderActivity } from "@/domain/provider/activity";
import { t } from "@/infrastructure/i18n/translations";
import { ActivityResults } from "./ActivityResults";
import { ActivityEvolution } from "./ActivityEvolution";
import { ActivityComparison } from "./ActivityComparison";
import { activityDate, activityRange } from "./activity-format";

export function ActivityView({ activity }: { activity: ProviderActivity }) {
  const labels = t.providerActivity;
  return (
    <div className="min-w-0 space-y-7">
      <section aria-label={labels.period} className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">{labels.period}</h2>
        <p data-testid="activity-period">{activityRange(activity.period.from, activity.period.to)}</p>
        <p className="text-sm text-slate-600">{labels.periodHelp}</p>
        <p className="mt-2 text-xs text-slate-500">{labels.calculatedAt} {activityDate(activity.calculatedAt)}</p>
      </section>
      <ActivityResults results={activity.results} />
      <ActivityEvolution intervals={activity.evolution} />
      {activity.comparison && <ActivityComparison comparison={activity.comparison} />}
      <section aria-labelledby="activity-pending-title" className="rounded-xl bg-slate-100 p-4 space-y-3">
        <h2 id="activity-pending-title" className="text-xl font-semibold">{labels.pending}</h2>
        <p className="text-sm text-slate-600">{labels.pendingHelp}</p>
        <dl className="grid gap-4 sm:grid-cols-3">
          {(["requests", "scheduledOrders", "awaitingPaymentOrders"] as const).map(key => <div key={key}>
            <dt className="text-sm">{labels[key]}</dt><dd className="text-xl font-bold">{activity.currentPending[key]}</dd>
          </div>)}
        </dl>
      </section>
    </div>
  );
}
