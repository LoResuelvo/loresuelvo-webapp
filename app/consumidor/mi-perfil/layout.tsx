import type { ReactNode } from "react";
import { getAuthService } from "@/infrastructure/auth";
import ConsumerHeader from "@/components/consumer/home/ConsumerHeader";
import Sidebar from "@/components/consumer/Sidebar";

export const dynamic = "force-dynamic";

interface ConsumerProfileLayoutProps {
  children: ReactNode;
}

export default async function ConsumerProfileLayout({
  children,
}: ConsumerProfileLayoutProps) {
  const session = await getAuthService().getSession();

  return (
    <div className="min-h-screen bg-brand-neutral/30 flex flex-col md:flex-row text-brand-primary">
      <Sidebar responsive />
      <div className="min-w-0 flex-1 flex flex-col">
        <ConsumerHeader session={session} />
        {children}
      </div>
    </div>
  );
}
