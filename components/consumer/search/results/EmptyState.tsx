import { Info } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { t } from "@/infrastructure/i18n/translations";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  variant: "no-category" | "no-results";
  className?: string;
}

export default function EmptyState({ variant, className }: EmptyStateProps) {
  const copy = variant === "no-category"
    ? t.consumerUx.searchEmpty.noCategory
    : t.consumerUx.searchEmpty.noResults;

  return (
    <section
      aria-labelledby="search-empty-title"
      className={cn("bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center", className)}
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
        <Info className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 id="search-empty-title" className="text-subtitle font-bold text-brand-primary mb-2">
        {copy.title}
      </h3>
      <p className="text-slate-500 font-medium max-w-md">
        {copy.description}
      </p>
      <nav aria-label={t.consumerUx.searchEmpty.navigationLabel} className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href={ROUTES.consumer.home}
          className="rounded-lg bg-brand-primary px-4 py-2 text-small font-semibold text-white hover:bg-brand-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary focus-visible:ring-offset-2"
        >
          {t.consumerUx.searchEmpty.changeCategory}
        </Link>
        <Link
          href={ROUTES.consumer.diagnostico}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-small font-semibold text-brand-secondary hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary focus-visible:ring-offset-2"
        >
          {t.consumerUx.searchEmpty.goToDiagnosis}
        </Link>
      </nav>
    </section>
  );
}
