import type { ConversionRequests } from "@/domain/provider/conversion";
import { t } from "@/infrastructure/i18n/translations";
import { formatConversionRatio } from "./conversion-format";

interface MetricCardProps {
  readonly title: string;
  readonly value: React.ReactNode;
  readonly testId: string;
}

function MetricCard({ title, value, testId }: MetricCardProps) {
  return (
    <div
      data-testid={testId}
      className="rounded-xl border border-slate-200 bg-white p-4 min-w-0 space-y-2"
    >
      <h3 className="text-sm font-medium text-slate-600">{title}</h3>
      <p className="text-2xl font-bold tabular-nums text-brand-primary">{value}</p>
    </div>
  );
}

export function ConversionRequestsSection({
  requests,
}: {
  readonly requests: ConversionRequests;
}) {
  const labels = t.providerConversion;

  return (
    <section
      aria-labelledby="conversion-requests-title"
      data-testid="conversion-requests-section"
      className="space-y-3"
    >
      <h2 id="conversion-requests-title" className="text-xl font-semibold">
        {labels.requestsTitle}
      </h2>
      <p className="text-sm text-slate-600">
        {labels.requestsHelp}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={labels.requestsReceived}
          value={requests.received}
          testId="requests-received"
        />
        <MetricCard
          title={labels.requestsAccepted}
          value={requests.accepted}
          testId="requests-accepted"
        />
        <MetricCard
          title={labels.requestsPending}
          value={requests.pending}
          testId="requests-pending"
        />
        <div
          data-testid="requests-acceptance-rate"
          className="rounded-xl border border-slate-200 bg-white p-4 min-w-0 space-y-2"
        >
          <h3 className="text-sm font-medium text-slate-600">{labels.acceptanceRate}</h3>
          <p className="break-words text-sm font-semibold tabular-nums text-brand-primary pt-2">
            {formatConversionRatio(requests.acceptanceRate, labels.acceptanceRateNoun)}
          </p>
        </div>
      </div>
    </section>
  );
}
