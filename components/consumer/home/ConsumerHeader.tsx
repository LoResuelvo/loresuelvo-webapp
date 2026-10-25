"use client";

import { AuthSession } from "@/infrastructure/auth/types";
import { LogOut, UserRound, Menu } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ROUTES } from "@/lib/routes";
import { t } from "@/infrastructure/i18n/translations";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import Sidebar from "@/components/consumer/Sidebar";

interface ConsumerHeaderProps {
  session: AuthSession | null;
}

export default function ConsumerHeader({ session }: ConsumerHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
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
    <header className="h-16 md:h-20 shrink-0 border-b border-slate-200 bg-brand-neutral flex items-center justify-between md:justify-end px-4 md:px-8 gap-4 sticky top-0 z-10">
      <Button
        ref={menuButtonRef}
        variant="ghost"
        size="icon"
        className="md:hidden size-11"
        aria-label={t.consumerShell.menu}
        aria-haspopup="dialog"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen(true)}
      >
        <Menu aria-hidden="true" />
      </Button>
      <Modal
        open={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        title={t.consumerShell.menuTitle}
        closeLabel={t.consumerShell.closeMenu}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          menuButtonRef.current?.focus();
        }}
      >
        <Sidebar responsive onNavigate={() => setIsMenuOpen(false)} />
      </Modal>
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
                <p className="text-body font-bold text-brand-primary truncate">
                  {session.user.firstName} {session.user.lastName}
                </p>
                <p className="text-small text-slate-500 truncate">
                  {session.user.email}
                </p>
              </div>
            )}
            <div className="py-1">
              <Link
                href={ROUTES.consumer.profile}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-body text-brand-primary hover:bg-slate-50 font-medium transition-colors w-full text-left"
              >
                <UserRound className="w-4 h-4" aria-hidden="true" />
                <span>{t.header.profile}</span>
              </Link>
              <a
                href={ROUTES.auth.logout}
                className="flex items-center gap-2.5 px-4 py-2 text-body text-rose-600 hover:bg-rose-50 font-medium transition-colors w-full text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.header.logout}</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
