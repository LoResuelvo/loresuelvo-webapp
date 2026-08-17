"use client";

import Sidebar from "@/components/consumer/Sidebar";
import { AuthSession } from "@/infrastructure/auth/types";
import { Category } from "@/domain/shared/types";
import { ServiceProposalSummary } from "@/domain/messaging/types";
import ConsumerHeader from "./ConsumerHeader";
import CategoryGrid from "./CategoryGrid";
import DiagnosisHero from "@/components/consumer/diagnosis/DiagnosisHero";
import { t } from "@/infrastructure/i18n/translations";
import { useRouter } from "next/navigation";
import { Clock, CalendarCheck } from "lucide-react";
import { ProposalCarousel } from "./ProposalCarousel";

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

  const handleViewConversation = (proposal: ServiceProposalSummary) => {
    router.push(`/consumidor/mensajes?provider_id=${proposal.counterpart.id}`);
  };

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
                {/* Carousel de Propuestas Pendientes */}
                <ProposalCarousel
                  title={t.serviceProposals.consumerHome.pendingTitle}
                  titleId="pending-proposals-title"
                  icon={Clock}
                  iconColor="text-amber-500"
                  badgeClass="bg-amber-100 text-amber-800"
                  proposals={pendingProposals}
                  emptyMessage={t.serviceProposals.consumerHome.emptyPending}
                  prevLabel={t.serviceProposals.consumerHome.prevProposal}
                  nextLabel={t.serviceProposals.consumerHome.nextProposal}
                  activeDotClass="bg-amber-500"
                  onViewConversation={handleViewConversation}
                />

                {/* Carousel de Servicios Próximos */}
                <ProposalCarousel
                  title={t.serviceProposals.consumerHome.acceptedTitle}
                  titleId="accepted-proposals-title"
                  icon={CalendarCheck}
                  iconColor="text-emerald-600"
                  badgeClass="bg-emerald-100 text-emerald-800"
                  proposals={acceptedProposals}
                  emptyMessage={t.serviceProposals.consumerHome.emptyAccepted}
                  prevLabel={t.serviceProposals.consumerHome.prevService}
                  nextLabel={t.serviceProposals.consumerHome.nextService}
                  activeDotClass="bg-emerald-600"
                  onViewConversation={handleViewConversation}
                />
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}