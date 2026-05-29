import { DollarSign, Star, Wrench } from "lucide-react";
import { ProviderMetrics } from "@/lib/provider-home/types";

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
          Métricas del Prestador
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <article
          className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col items-center text-center gap-2"
          data-metric="income"
        >
          <DollarSign className="h-8 w-8 text-brand-secondary" aria-hidden="true" />
          <p className="text-[14px] font-medium text-slate-500">Ingresos del período</p>
          <p className="text-[24px] font-bold text-brand-primary">{metrics.incomeLabel}</p>
        </article>

        <article
          className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col items-center text-center gap-2"
          data-metric="jobs-completed"
        >
          <Wrench className="h-8 w-8 text-brand-secondary" aria-hidden="true" />
          <p className="text-[14px] font-medium text-slate-500">Trabajos realizados</p>
          <p className="text-[24px] font-bold text-brand-primary">{metrics.jobsCompletedCount}</p>
        </article>

        <article
          className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col items-center text-center gap-2"
          data-metric="rating"
        >
          <Star className="h-8 w-8 text-brand-secondary" aria-hidden="true" />
          <p className="text-[14px] font-medium text-slate-500">Calificación promedio</p>
          <p className="text-[24px] font-bold text-brand-primary">{metrics.ratingLabel}</p>
        </article>
      </div>
    </section>
  );
}