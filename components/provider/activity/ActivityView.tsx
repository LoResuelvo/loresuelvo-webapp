import type { ProviderActivity } from "@/domain/provider/activity";
import { CalendarDays, MessageSquare, Wallet } from "lucide-react";
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
        <p className="mt-2 text-xs text-slate-500">{labels.calculatedAt} {activityDate(activity.calculatedAt)}</p>
      </section>
      <ActivityResults results={activity.results} />
      <ActivityEvolution intervals={activity.evolution} />
      {activity.comparison && <ActivityComparison comparison={activity.comparison} />}
      <section aria-labelledby="activity-pending-title" className="space-y-4">
        <h2 id="activity-pending-title" className="text-xl font-semibold">{labels.pending}</h2>
        <p className="text-sm text-slate-600">{labels.pendingHelp}</p>
        <dl className="grid gap-4 lg:grid-cols-3">
          {([
            { key: "requests", Icon: MessageSquare, accent: "bg-blue-50 text-blue-700" },
            { key: "scheduledOrders", Icon: CalendarDays, accent: "bg-brand-secondary/10 text-brand-secondary" },
            { key: "awaitingPaymentOrders", Icon: Wallet, accent: "bg-amber-50 text-amber-700" },
          ] as const).map(({ key, Icon, accent }) => <div key={key} className="relative flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 pt-20 shadow-sm">
            <dt className="order-2 mt-1 break-words text-sm text-slate-600">
              <span aria-hidden="true" className={`absolute left-5 top-5 flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}><Icon className="h-5 w-5" /></span>
              {labels[key]}
            </dt>
            <dd className="order-1 min-w-0 break-words text-3xl font-bold leading-tight tabular-nums tracking-tight text-slate-900">{activity.currentPending[key]}</dd>
          </div>)}
        </dl>
      </section>
    </div>
  );
}
