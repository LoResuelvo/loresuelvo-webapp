"use client";

import { AuthSession } from "@/lib/auth/types";
import { User, LogOut } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ROUTES } from "@/lib/routes";
import { t } from "@/lib/i18n/translations";

interface ConsumerHeaderProps {
  session: AuthSession | null;
}

export default function ConsumerHeader({ session }: ConsumerHeaderProps) {
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
          <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 transition-all animate-in fade-in slide-in-from-top-1 duration-100">
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
                <span>{t.header.logout}</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
