import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { t } from "@/infrastructure/i18n/translations";

export function PerformanceNavigation({ active }: { active: "activity" | "collections" | "reputation" | "conversion" }) {
  const tabs = [
    { key: "activity", href: ROUTES.provider.activity, label: t.providerActivity.activity },
    { key: "collections", href: ROUTES.provider.collections, label: t.providerCollections.collections },
    { key: "reputation", href: ROUTES.provider.reputation, label: t.providerReputation.reputation },
    { key: "conversion", href: ROUTES.provider.conversion, label: t.providerConversion.conversion },
  ] as const;

  return (
    <nav aria-label={t.providerActivity.title} className="flex flex-wrap gap-2">
      {tabs.map(({ key, href, label }) => (
        <Link
          key={key}
          href={href}
          aria-current={active === key ? "page" : undefined}
          className={`rounded-lg px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-brand-secondary ${
            active === key ? "bg-brand-secondary/20 text-brand-secondary" : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
