import { Info } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  className?: string;
}

export default function EmptyState({ className }: EmptyStateProps = {}) {
  return (
    <div className={cn("bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center", className)}>
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
        <Info className="w-6 h-6" />
      </div>
      <h3 className="text-[18px] font-bold text-brand-primary mb-2">
        {t.consumerSearch.emptyState.title}
      </h3>
      <p className="text-slate-500 font-medium max-w-md">
        {t.consumerSearch.emptyState.subtitle}
      </p>
    </div>
  );
}
