"use client";

import Sidebar from "@/components/consumer/Sidebar";
import { AuthSession } from "@/infrastructure/auth/types";
import { Category } from "@/domain/shared/types";
import { ServiceProposalSummary } from "@/domain/messaging/types";
import ConsumerHeader from "./ConsumerHeader";
import CategoryGrid from "./CategoryGrid";
import DiagnosisHero from "@/components/consumer/diagnosis/DiagnosisHero";
import { ProposalCard } from "@/components/messaging/ProposalCard";
import { t } from "@/infrastructure/i18n/translations";
import { useRouter } from "next/navigation";
import { Clock, CalendarCheck } from "lucide-react";

interface ConsumerHomeProps {
  session: AuthSession | null;
  categories?: Category[];
  pendingProposals?: ServiceProposalSummary[];
  acceptedProposals?: ServiceProposalSummary[];
}

export default function ConsumerHome({ 
  session, 
  categories = [],
  pendingProposals = [],
  acceptedProposals = []
}: ConsumerHomeProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-brand-neutral/30 flex font-sans text-brand-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ConsumerHeader session={session} />
        <main className="flex-1 p-6 lg:p-10">
          <div className="max-w-7xl mx-auto flex flex-col gap-10">
            {/* 1. Hero a ancho completo en la parte superior */}
            <DiagnosisHero className="w-full" />

            {/* 2. Sección inferior dividida en 2 columnas al mismo nivel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              {/* Columna Izquierda: Explorar por Categoría (~60% / 7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <CategoryGrid categories={categories} />
              </div>

              {/* Columna Derecha: Panel de Propuestas y Servicios (~40% / 5 cols) */}
              <aside 
                aria-label="Panel de actividad y servicios" 
                className="lg:col-span-5 flex flex-col gap-8"
              >
                {/* Propuestas Pendientes */}
                <section aria-labelledby="pending-proposals-title" role="region" className="w-full">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-500" aria-hidden="true" />
                        <h2 id="pending-proposals-title" className="text-[20px] md:text-[22px] font-bold text-brand-primary">
                          {t.serviceProposals.consumerHome.pendingTitle}
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t.serviceProposals.consumerHome.pendingSubtitle}
                      </p>
                    </div>
                    {pendingProposals.length > 0 && (
                      <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        {pendingProposals.length}
                      </span>
                    )}
                  </div>

                  {pendingProposals.length === 0 ? (
                    <div className="bg-white rounded-2xl p-6 border border-dashed border-slate-200 text-center shadow-xs">
                      <p className="text-sm text-slate-400 font-medium">
                        {t.serviceProposals.consumerHome.emptyPending}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {pendingProposals.map(proposal => (
                        <ProposalCard 
                          key={proposal.id} 
                          proposal={proposal} 
                          isProvider={false}
                          onViewConversation={() => {
                            router.push(`/consumidor/mensajes?provider_id=${proposal.counterpart.id}`);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* Servicios Próximos */}
                <section aria-labelledby="accepted-proposals-title" role="region" className="w-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                      <h2 id="accepted-proposals-title" className="text-[20px] md:text-[22px] font-bold text-brand-primary">
                        {t.serviceProposals.consumerHome.acceptedTitle}
                      </h2>
                    </div>
                    {acceptedProposals.length > 0 && (
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        {acceptedProposals.length}
                      </span>
                    )}
                  </div>

                  {acceptedProposals.length === 0 ? (
                    <div className="bg-white rounded-2xl p-6 border border-dashed border-slate-200 text-center shadow-xs">
                      <p className="text-sm text-slate-400 font-medium">
                        {t.serviceProposals.consumerHome.emptyAccepted}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {acceptedProposals.map(proposal => (
                        <ProposalCard 
                          key={proposal.id} 
                          proposal={proposal} 
                          isProvider={false}
                          onViewConversation={() => {
                            router.push(`/consumidor/mensajes?provider_id=${proposal.counterpart.id}`);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}