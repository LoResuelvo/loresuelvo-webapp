"use client";

import Sidebar from "@/components/consumer/Sidebar";
import { AuthSession } from "@/lib/auth/types";
import { Category } from "@/lib/api/types";
import ConsumerHeader from "./ConsumerHeader";
import CategoryGrid from "./CategoryGrid";

interface ConsumerHomeProps {
  session: AuthSession | null;
  categories?: Category[];
}

export default function ConsumerHome({ session, categories = [] }: ConsumerHomeProps) {
  return (
    <div className="min-h-screen bg-brand-neutral/30 flex font-sans text-brand-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ConsumerHeader session={session} />
        <main className="flex-1 p-8 lg:p-10">
          <CategoryGrid categories={categories} />
        </main>
      </div>
    </div>
  );
}