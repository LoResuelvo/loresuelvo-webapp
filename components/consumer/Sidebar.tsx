"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home } from "lucide-react";
import { ROUTES } from "@/lib/routes";

export default function Sidebar() {
  const pathname = usePathname();
  const isHomeActive = pathname === ROUTES.consumer.home;

  return (
    <aside className="w-[260px] bg-brand-neutral border-r border-slate-200 flex flex-col h-screen sticky top-0">
      <div className="p-6 h-20 flex items-center">
        <Link href={ROUTES.home} className="flex items-center gap-3">
          <span className="text-[20px] font-extrabold tracking-tight text-brand-primary">
            LoResuelvo
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-4 flex flex-col gap-2 mt-2">
        <Link 
          href={ROUTES.consumer.home}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${
            isHomeActive 
              ? "bg-brand-secondary/20 text-brand-secondary" 
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Inicio</span>
        </Link>
      </nav>
    </aside>
  );
}
