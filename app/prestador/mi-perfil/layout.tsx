import type { ReactNode } from "react";
import { getAuthService } from "@/infrastructure/auth";
import ProviderHeader from "@/components/provider/home/layout/ProviderHeader";
import ProviderSidebar from "@/components/provider/home/layout/ProviderSidebar";

export const dynamic = "force-dynamic";

interface ProviderProfileLayoutProps {
  children: ReactNode;
}

export default async function ProviderProfileLayout({
  children,
}: ProviderProfileLayoutProps) {
  const session = await getAuthService().getSession();

  return (
    <div className="min-h-screen bg-brand-neutral/30 flex flex-col md:flex-row text-brand-primary">
      <ProviderSidebar responsive />
      <div className="min-w-0 flex-1 flex flex-col">
        <ProviderHeader session={session} />
        {children}
      </div>
    </div>
  );
}
