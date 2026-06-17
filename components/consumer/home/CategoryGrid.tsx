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
  "Electricista": Zap,
  "Climatización": Snowflake,
  "Pintura": PaintRoller,
  "Construcción": Hammer,
};

interface CategoryGridProps {
  categories: Category[];
  className?: string;
}

export default function CategoryGrid({ categories, className }: CategoryGridProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-[28px] font-bold tracking-tight text-brand-primary mb-1">
            {t.consumerHome.exploreCategories}
          </h2>
          <p className="text-slate-500 font-medium">
            {t.consumerHome.exploreCategoriesSubtitle}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => {
          const Icon = ICON_MAP[category.name] || HelpCircle;
          return (
            <Link 
              href={`${ROUTES.consumer.buscar}?category_id=${category.id}`} 
              key={category.id}
            >
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-[140px] justify-between">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-brand-primary">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[18px] font-bold text-brand-primary">
                  {category.name}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
