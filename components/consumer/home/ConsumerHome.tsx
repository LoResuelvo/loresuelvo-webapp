"use client";

import Sidebar from "@/components/consumer/Sidebar";
import { AuthSession } from "@/lib/auth/types";
import { Category } from "@/lib/api/types";
import { User, LogOut, Bath, Flame, Zap, Snowflake, PaintRoller, Hammer, HelpCircle } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ROUTES } from "@/lib/routes";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "Plomería": Bath,
  "Gas": Flame,
  "Electricista": Zap,
  "Climatización": Snowflake,
  "Pintura": PaintRoller,
  "Construcción": Hammer,
};

export default function ConsumerHome({ session, categories = [] }: { session: AuthSession | null; categories?: Category[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userInitials = session?.user?.firstName 
    ? session.user.firstName.charAt(0).toUpperCase() 
    : "";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-brand-neutral/30 flex font-sans text-brand-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 border-b border-slate-200 bg-brand-neutral/30 flex items-center justify-end px-8 gap-6 sticky top-0 z-10">
          
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shadow-sm flex-shrink-0 select-none overflow-hidden hover:bg-slate-200/50 hover:border-slate-300 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-secondary/40"
              aria-expanded={isOpen}
              aria-haspopup="true"
            >
              {userInitials ? (
                <span className="text-[14px] font-bold text-slate-600">
                  {userInitials}
                </span>
              ) : (
                <User className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 transition-all">
                {session?.user && (
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-[14px] font-bold text-brand-primary truncate">
                      {session.user.firstName} {session.user.lastName}
                    </p>
                    <p className="text-[12px] text-slate-500 truncate">
                      {session.user.email}
                    </p>
                  </div>
                )}
                <div className="py-1">
                  <Link
                    href={ROUTES.auth.logout}
                    className="flex items-center gap-2.5 px-4 py-2 text-[14px] text-rose-600 hover:bg-rose-50 font-medium transition-colors w-full text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar sesión</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-8 lg:p-10">
          <div className="max-w-6xl">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-[28px] font-bold tracking-tight text-brand-primary mb-1">
                  Explorar por Categoría
                </h2>
                <p className="text-slate-500 font-medium">
                  Encuentra profesionales especializados para cada necesidad del hogar.
                </p>
              </div>
              <Link 
                href={ROUTES.consumer.categorias} // TODO: Implementar esta ruta
                className="text-brand-secondary font-bold text-[15px] hover:underline"
              >
                Ver todas &rarr;
              </Link>
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
        </main>
      </div>
    </div>
  );
}