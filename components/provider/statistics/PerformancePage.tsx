import type { ReactNode } from "react";
import type { AuthSession } from "@/infrastructure/auth/types";
import ProviderSidebar from "@/components/provider/home/layout/ProviderSidebar";
import ProviderHeader from "@/components/provider/home/layout/ProviderHeader";
import { PerformanceNavigation } from "./PerformanceNavigation";

interface PerformancePageProps {
  readonly session: AuthSession | null;
  readonly active: "activity" | "collections" | "reputation" | "conversion";
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}

export function PerformancePage({ session, active, title, description, children }: PerformancePageProps) {
  return (
    <div className="min-h-screen bg-brand-neutral/30 flex flex-col md:flex-row text-brand-primary">
      <ProviderSidebar responsive />
      <div className="flex-1 flex flex-col min-w-0">
        <ProviderHeader session={session} />
        <main className="min-w-0 w-full max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-10">
          <header>
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="mt-2 text-slate-600">{description}</p>
          </header>
          <PerformanceNavigation active={active} />
          {children}
        </main>
      </div>
    </div>
  );
}
