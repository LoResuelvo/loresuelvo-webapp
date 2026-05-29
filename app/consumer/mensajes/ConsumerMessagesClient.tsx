"use client";

import Sidebar from "@/components/consumer/Sidebar";
import ConsumerHeader from "@/components/consumer/home/ConsumerHeader";
import { AuthSession } from "@/lib/auth/types";

interface ConsumerMessagesClientProps {
  session: AuthSession | null;
}

export default function ConsumerMessagesClient({ session }: ConsumerMessagesClientProps) {
  return (
    <div className="min-h-screen bg-brand-neutral/30 flex font-sans text-brand-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ConsumerHeader session={session} />
        <main className="flex-1 p-8 lg:p-10">
          <div className="max-w-4xl w-full">
            <h1 className="text-[26px] font-bold text-brand-primary mb-6">Mensajes</h1>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
              <p className="text-slate-500">No tienes conversaciones aún</p>
              <p className="text-slate-400 text-sm mt-2">Inicia un chat con un prestador desde la búsqueda</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}