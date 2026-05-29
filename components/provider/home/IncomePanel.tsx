import { TrendingUp } from "lucide-react";
import { ProviderMetrics } from "@/lib/provider-home/types";

interface IncomePanelProps {
  metrics: ProviderMetrics;
}

export default function IncomePanel({ metrics }: IncomePanelProps) {
  return (
    <aside
      aria-label="Panel de ingresos"
      className="w-[320px] lg:w-[360px] flex-shrink-0 hidden lg:block"
    >
      <div className="sticky top-28 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl text-white">
        <h2 className="text-[18px] font-bold tracking-wide mb-2">INGRESOS DEL MES</h2>
        
        <a
          href="#"
          className="text-[13px] text-teal-400 hover:text-teal-300 transition-colors flex items-center gap-1 mb-6"
        >
          Ver detalle completo
          <span className="text-xs">↗</span>
        </a>

        <p className="text-[42px] font-extrabold tracking-tight mb-2">{metrics.incomeLabel}</p>

        <div className="flex items-center gap-1.5 text-teal-400 mb-8">
          <TrendingUp className="h-4 w-4" aria-hidden="true" />
          <span className="text-[14px] font-medium">+0% vs mes anterior</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">TRABAJOS</p>
            <p className="text-[24px] font-bold">{metrics.jobsCompletedCount}</p>
          </div>

          <div className="bg-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">PUNTAJE</p>
            <p className="text-[24px] font-bold">{metrics.ratingLabel} ★</p>
          </div>
        </div>
      </div>
    </aside>
  );
}