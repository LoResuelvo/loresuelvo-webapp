"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, CalendarDays, Home, MessageSquare, User } from "lucide-react";
import { ROUTES } from "@/lib/routes";

const providerNavigationItems = [
  { label: "Inicio", href: ROUTES.provider.home, icon: Home },
  { label: "Calendario", href: "", icon: CalendarDays },
  { label: "Mensajes", href: ROUTES.provider.messages, icon: MessageSquare },
  { label: "Trabajos", href: "", icon: BriefcaseBusiness },
  { label: "Perfil", href: "", icon: User },
];

export default function ProviderSidebar() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Panel lateral del prestador"
      className="w-[260px] bg-brand-neutral border-r border-slate-200 flex flex-col h-screen sticky top-0"
    >
      <div className="p-6 h-20 flex items-center">
        <Link href={ROUTES.home} className="flex items-center gap-3">
          <span className="text-[20px] font-extrabold tracking-tight text-brand-primary">
            LoResuelvo
          </span>
        </Link>
      </div>

      <nav
        aria-label="Navegación del prestador"
        className="flex-1 px-4 flex flex-col gap-2 mt-2"
      >
        {providerNavigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href && item.href !== "";

          return (
            <Link
              key={item.label}
              href={item.href || "#"}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors ${
                isActive
                  ? "bg-brand-secondary/20 text-brand-secondary"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
