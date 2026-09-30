import type { ActivityResults as Results } from "@/domain/provider/activity";
import { t } from "@/infrastructure/i18n/translations";
import { Card, CardContent } from "@/components/ui/card";
import { activityMoney } from "./activity-format";

export function ActivityResults({ results }: { results: Results }) {
  const labels = t.providerActivity;
  const metrics = [
    [labels.confirmedBookings, results.confirmedBookings],
    [labels.reportedCompletions, results.reportedCompletions],
    [labels.fullyPaidWorkOrders, results.fullyPaidWorkOrders],
    [labels.clientsServed, results.clientsServed],
    [labels.newClients, results.newClients],
    [labels.returningClients, results.returningClients],
    [labels.agreedValueCents, activityMoney(results.agreedValueCents)],
    [labels.averageValueCents, activityMoney(results.averageValueCents)],
  ];
  return (
    <section aria-labelledby="activity-results-title" className="space-y-3">
      <h2 id="activity-results-title" className="text-xl font-semibold">{labels.results}</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <Card key={label} size="sm"><CardContent><dl>
            <dt className="text-sm text-slate-600">{label}</dt>
            <dd className="mt-2 text-2xl font-bold tabular-nums">{value}</dd>
          </dl></CardContent></Card>
        ))}
      </div>
      <p className="text-sm text-slate-600">{labels.valueHelp}</p>
    </section>
  );
}
