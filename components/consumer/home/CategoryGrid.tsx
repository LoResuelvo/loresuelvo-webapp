"use client";

import { Category } from "@/domain/shared/types";
import { Bath, Flame, Zap, Snowflake, PaintRoller, Hammer, HelpCircle } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { t } from "@/infrastructure/i18n/translations";

import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "Plomería": Bath,
  "Gas": Flame,
  "Electricidad": Zap,
  "Climatización": Snowflake,
  "Pintura": PaintRoller,
  "Construcción": Hammer,
  "Carpintería": Hammer,
};

interface CategoryGridProps {
  categories: Category[];
  className?: string;
}

export default function CategoryGrid({ categories, className }: CategoryGridProps) {
  return (
    <section aria-labelledby="explore-categories-title" className={cn("w-full", className)}>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 id="explore-categories-title" className="text-title font-bold tracking-tight text-brand-primary mb-1">
            {t.consumerHome.exploreCategories}
          </h2>
          <p className="text-body text-slate-500 font-medium">
            {t.consumerHome.exploreCategoriesSubtitle}
          </p>
        </div>
      </div>

      {categories.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-body text-slate-600">{t.consumerShell.categoriesEmpty}</p>
          <Link href={ROUTES.consumer.aiMessages} className="mt-4 inline-flex min-h-11 items-center font-semibold text-brand-secondary underline underline-offset-4">
            {t.consumerShell.startDiagnosis}
          </Link>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {categories.map((category) => {
          const Icon = ICON_MAP[category.name] || HelpCircle;
          return (
            <Link 
              href={`${ROUTES.consumer.buscar}?category_id=${category.id}`} 
              key={category.id}
              className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary rounded-2xl"
            >
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-brand-secondary/40 transition-all cursor-pointer flex flex-col h-[130px] md:h-[135px] justify-between">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-brand-primary group-hover:bg-brand-secondary/15 group-hover:text-brand-secondary transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="break-words text-base sm:text-subtitle font-bold text-brand-primary group-hover:text-brand-secondary transition-colors">
                  {category.name}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
