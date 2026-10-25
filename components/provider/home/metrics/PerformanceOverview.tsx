import Link from "next/link";
import { ArrowUpRight, BarChart3 } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";
import { ROUTES } from "@/lib/routes";

export default function PerformanceOverview() {
  const copy = t.providerHome.overview;
  return (
    <aside aria-label={copy.performanceTitle} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex items-start gap-4">
        <span className="rounded-xl bg-slate-100 p-3 text-slate-600"><BarChart3 className="h-5 w-5" aria-hidden="true" /></span>
        <div>
          <h2 className="font-heading text-lg font-semibold text-brand-primary">{copy.performanceTitle}</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{copy.performanceDescription}</p>
        </div>
      </div>
      <Link href={ROUTES.provider.activity} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-primary transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary">
        {copy.performanceAction}<ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </aside>
  );
}
