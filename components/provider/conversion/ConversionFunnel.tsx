import type { ProviderConversion, ConversionRatio } from "@/domain/provider/conversion";
import { t } from "@/infrastructure/i18n/translations";
import { statisticsDate, statisticsRange } from "../statistics/statistics-format";
import { formatConversionRatio } from "./conversion-format";
import { ConversionRequestsSection } from "./ConversionRequestsSection";

interface FunnelStageProps {
  readonly title: string;
  readonly count: number;
  readonly testId: string;
  readonly cohortRate?: { readonly ratio: ConversionRatio; readonly noun: string };
  readonly previousStageRate?: { readonly ratio: ConversionRatio; readonly noun: string };
}

function FunnelStageCard({
  title,
  count,
  testId,
  cohortRate,
  previousStageRate,
}: FunnelStageProps) {
  const labels = t.providerConversion;

  return (
    <div
      data-testid={testId}
      className="rounded-xl border border-slate-200 bg-white p-4 min-w-0 space-y-2"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-600">{title}</h3>
      </div>
      <p className="text-2xl font-bold tabular-nums text-brand-primary">{count}</p>
      {(cohortRate || previousStageRate) && (
        <dl className="space-y-2 break-words pt-2 border-t border-slate-100 text-xs text-slate-600">
          {cohortRate && (
            <div>
              <dt className="font-medium text-slate-500">{labels.cohortRate}</dt>
              <dd className="font-semibold tabular-nums text-slate-700">
                {formatConversionRatio(cohortRate.ratio, cohortRate.noun)}
              </dd>
            </div>
          )}
          {previousStageRate && (
            <div>
              <dt className="font-medium text-slate-500">{labels.previousStageRate}</dt>
              <dd className="font-semibold tabular-nums text-slate-700">
                {formatConversionRatio(previousStageRate.ratio, previousStageRate.noun)}
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

function ConversionPeriodCard({
  period,
  observedAt,
}: {
  readonly period: ProviderConversion["period"];
  readonly observedAt: string;
}) {
  const labels = t.providerConversion;

  return (
    <section
      aria-label={labels.effectivePeriod}
      className="rounded-xl border border-slate-200 bg-white p-4 min-w-0"
    >
      <h2 className="font-semibold">{labels.effectivePeriod}</h2>
      <p data-testid="conversion-period" className="break-words">
        {statisticsRange(period.from, period.to)}
      </p>
      <p className="mt-1 text-xs text-slate-600">{t.providerActivity.periodBoundsHelp}</p>
      <p data-testid="conversion-observed-at" className="mt-2 text-xs text-slate-500">
        {labels.observedAt}: {statisticsDate(observedAt)}
      </p>
      <p className="mt-3 text-xs text-slate-500 border-t border-slate-100 pt-2">
        {labels.cohortHelp}
      </p>
    </section>
  );
}

function UncontractedCard({ count }: { readonly count: number }) {
  const labels = t.providerConversion;

  return (
    <div
      data-testid="uncontracted-proposals"
      className="rounded-xl border border-slate-200 bg-white p-4 min-w-0 space-y-2"
    >
      <h3 className="text-sm font-medium text-slate-600">{labels.uncontracted}</h3>
      <p className="text-2xl font-bold tabular-nums text-brand-primary">{count}</p>
    </div>
  );
}

export function ConversionFunnel({ data }: { readonly data: ProviderConversion }) {
  const labels = t.providerConversion;
  const { stages, rates, uncontracted } = data.proposals;

  return (
    <div className="min-w-0 space-y-7">
      <ConversionPeriodCard period={data.period} observedAt={data.observedAt} />

      <section
        aria-labelledby="conversion-funnel-title"
        className="space-y-3"
      >
        <h2 id="conversion-funnel-title" className="text-xl font-semibold">
          {labels.funnelTitle}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FunnelStageCard
            title={labels.issued}
            count={stages.issued}
            testId="funnel-stage-issued"
          />
          <FunnelStageCard
            title={labels.contracted}
            count={stages.contracted}
            testId="funnel-stage-contracted"
            cohortRate={{ ratio: rates.contracted.cohort, noun: labels.issuedNoun }}
            previousStageRate={{ ratio: rates.contracted.previousStage, noun: labels.issuedNoun }}
          />
          <FunnelStageCard
            title={labels.reported}
            count={stages.reported}
            testId="funnel-stage-reported"
            cohortRate={{ ratio: rates.reported.cohort, noun: labels.issuedNoun }}
            previousStageRate={{ ratio: rates.reported.previousStage, noun: labels.contractedNoun }}
          />
          <FunnelStageCard
            title={labels.paid}
            count={stages.paid}
            testId="funnel-stage-paid"
            cohortRate={{ ratio: rates.paid.cohort, noun: labels.issuedNoun }}
            previousStageRate={{ ratio: rates.paid.previousStage, noun: labels.reportedNoun }}
          />
        </div>
      </section>

      <section aria-labelledby="conversion-uncontracted-title" className="space-y-3">
        <h2 id="conversion-uncontracted-title" className="sr-only">
          {labels.uncontracted}
        </h2>
        <UncontractedCard count={uncontracted} />
      </section>

      <ConversionRequestsSection requests={data.requests} />
    </div>
  );
}
