import { DollarSign, Star, Wrench } from "lucide-react";
import { ProviderMetrics } from "@/domain/provider/types";
import { t } from "@/infrastructure/i18n/translations";
import { Card, CardContent } from "@/components/ui/card";

interface MetricsSectionProps {
  metrics: ProviderMetrics;
}

export default function MetricsSection({ metrics }: MetricsSectionProps) {
  return (
    <section
      aria-labelledby="metrics-title"
      className="max-w-4xl"
    >
      <div className="mb-5">
        <h2
          id="metrics-title"
          className="text-[26px] font-bold text-brand-primary"
        >
          {t.providerHome.metricsSection.title}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          size="none"
          data-metric="income"
        >
          <CardContent className="p-5 flex flex-col items-center text-center gap-2">
            <DollarSign className="h-8 w-8 text-brand-secondary" aria-hidden="true" />
            <p className="text-[14px] font-medium text-slate-500">{t.providerHome.metricsSection.incomeLabel}</p>
            <p className="text-[24px] font-bold text-brand-primary">{metrics.incomeLabel}</p>
          </CardContent>
        </Card>

        <Card
          size="none"
          data-metric="jobs-completed"
        >
          <CardContent className="p-5 flex flex-col items-center text-center gap-2">
            <Wrench className="h-8 w-8 text-brand-secondary" aria-hidden="true" />
            <p className="text-[14px] font-medium text-slate-500">{t.providerHome.metricsSection.jobsLabel}</p>
            <p className="text-[24px] font-bold text-brand-primary">{metrics.jobsCompletedCount}</p>
          </CardContent>
        </Card>

        <Card
          size="none"
          data-metric="rating"
        >
          <CardContent className="p-5 flex flex-col items-center text-center gap-2">
            <Star className="h-8 w-8 text-brand-secondary" aria-hidden="true" />
            <p className="text-[14px] font-medium text-slate-500">{t.providerHome.metricsSection.ratingLabel}</p>
            <p className="text-[24px] font-bold text-brand-primary">{metrics.ratingLabel}</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}