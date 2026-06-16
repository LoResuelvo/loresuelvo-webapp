import { BadgeCheck } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";

export default function HeroContent() {
  return (
    <div className="flex flex-col items-center text-center space-y-6 max-w-4xl mx-auto pt-6 pb-2 relative z-10">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-secondary/15 px-3.5 py-1.5 text-[13px] font-semibold text-brand-secondary">
        <BadgeCheck size={16} />
        {t.home.hero.badge}
      </div>
      <h2 className="text-4xl sm:text-5xl md:text-[54px] font-extrabold text-brand-primary leading-[1.12] tracking-tight">
        Soluciones profesionales<br />para tu hogar
      </h2>
      <p className="text-base sm:text-lg md:text-xl text-gray-500/90 max-w-2xl leading-relaxed font-medium">
        {t.home.hero.subtitle}
      </p>
    </div>
  );
}
