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
      className="rounded-xl border border-slate-200 bg-white p-5 min-w-0 space-y-2"
    >
      <h3 className="text-sm font-medium text-slate-600">{title}</h3>
      <p className="text-3xl font-bold text-brand-primary">{value}</p>
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
      className="space-y-4"
    >
      <h2 id="conversion-requests-title" className="text-xl font-semibold">
        {labels.requestsTitle}
      </h2>
      <p className="text-xs text-slate-500">
        {labels.requestsHelp}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          className="rounded-xl border border-slate-200 bg-white p-5 min-w-0 space-y-2"
        >
          <h3 className="text-sm font-medium text-slate-600">{labels.acceptanceRate}</h3>
          <p className="text-sm font-semibold text-brand-primary pt-2">
            {formatConversionRatio(requests.acceptanceRate, labels.acceptanceRateNoun)}
          </p>
        </div>
      </div>
    </section>
  );
}
