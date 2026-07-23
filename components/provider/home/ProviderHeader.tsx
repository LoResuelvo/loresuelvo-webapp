"use client";

import { AuthSession } from "@/infrastructure/auth/types";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ROUTES } from "@/lib/routes";
import { t } from "@/infrastructure/i18n/translations";
import { Avatar } from "@/components/ui/avatar";

interface ProviderHeaderProps {
  session: AuthSession | null;
  categoryName?: string;
}

export default function ProviderHeader({ session, categoryName }: ProviderHeaderProps) {
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
      {categoryName && (
        <span
          data-testid="provider-category"
          className="text-[13px] font-semibold text-brand-secondary bg-brand-secondary/10 px-3 py-1 rounded-full"
        >
          {categoryName}
        </span>
      )}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-shrink-0 select-none rounded-full focus:outline-none focus:ring-2 focus:ring-brand-secondary/40"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <Avatar
            src={session?.user?.profilePhotoUrl}
            alt={t.onboarding.photoUpload.label}
            size="xs"
            initials={userInitials}
            imgTestId="header-profile-photo"
            className="hover:bg-slate-200/50 hover:border-slate-300 transition-all cursor-pointer"
          />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 transition-all animate-in fade-in slide-in-from-top-1 duration-100">
            {session?.user && (
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-[14px] font-bold text-brand-primary truncate">
                  {session.user.firstName} {session.user.lastName}
                </p>
                {categoryName && (
                  <p className="text-[12px] text-brand-secondary font-medium truncate">
                    {categoryName}
                  </p>
                )}
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