import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { t } from "@/infrastructure/i18n/translations";

export function PerformanceNavigation({ active }: { active: "activity" | "collections" }) {
  return <nav aria-label={t.providerActivity.title} className="flex flex-wrap gap-2">
    {(["activity", "collections"] as const).map(key => <Link key={key} href={ROUTES.provider[key]} aria-current={active === key ? "page" : undefined} className={`rounded-lg px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-brand-secondary ${active === key ? "bg-brand-secondary/20 text-brand-secondary" : "bg-white text-slate-600 hover:bg-slate-100"}`}>
      {key === "activity" ? t.providerActivity.activity : t.providerCollections.collections}
    </Link>)}
  </nav>;
}
