import { BadgeCheck } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";

import { cn } from "@/lib/utils";

interface HeroContentProps {
  className?: string;
}

export default function HeroContent({ className }: HeroContentProps) {
  return (
    <div className={cn("flex flex-col items-center text-center space-y-6 pt-6 pb-2 relative z-10", className)}>
      <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-secondary/15 px-3.5 py-1.5 text-[13px] font-semibold text-brand-secondary">
        <BadgeCheck size={16} />
        {t.home.hero.badge}
      </div>
      <h2 className="text-4xl sm:text-5xl md:text-[54px] font-extrabold text-brand-primary leading-[1.12] tracking-tight">
        {t.home.hero.title}
      </h2>
      <p className="text-base sm:text-lg md:text-xl text-gray-500/90 max-w-2xl leading-relaxed font-medium">
        {t.home.hero.subtitle}
      </p>
    </div>
  );
}
