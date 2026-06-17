import Link from "next/link";
import { ArrowLeft, Wrench } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { t } from "@/infrastructure/i18n/translations";
import { cn } from "@/lib/utils";

interface CategoryHeaderProps {
  categoryName: string;
  className?: string;
}

export default function CategoryHeader({ categoryName, className }: CategoryHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={ROUTES.consumer.home}
          className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-brand-primary hover:bg-slate-50 transition-all shadow-sm group"
          title={t.consumerSearch.header.backTitle}
        >
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
        </Link>

        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-extrabold tracking-wider bg-emerald-50 text-emerald-700 uppercase border border-emerald-200/50 shadow-sm">
          <Wrench className="w-3.5 h-3.5" />
          {t.consumerSearch.header.categoryPrefix} {categoryName}
        </span>
      </div>

      <h2 className="text-[32px] font-extrabold tracking-tight text-brand-primary">
        {t.consumerSearch.header.title}
      </h2>
    </div>
  );
}
