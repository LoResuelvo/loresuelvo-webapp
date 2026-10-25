"use client";

import { useMemo } from "react";
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
import { getServiceProposalsAction } from "@/app/consumidor/mensajes/actions";
import { Button } from "@/components/ui/button";
import { useRealtimeProposalList } from "@/components/messaging/proposals/useRealtimeProposalList";
import { useClock } from "@/hooks/useClock";

const EMPTY_PROPOSALS: ServiceProposalSummary[] = [];

interface ConsumerHomeProps {
  session: AuthSession | null;
  categories?: Category[];
  pendingProposals?: ServiceProposalSummary[];
  acceptedProposals?: ServiceProposalSummary[];
  initialProposalsError?: boolean;
}

export default function ConsumerHome({ 
  session, 
  categories = [],
  pendingProposals: initialPendingProposals = EMPTY_PROPOSALS,
  acceptedProposals: initialAcceptedProposals = EMPTY_PROPOSALS,
  initialProposalsError = false
}: ConsumerHomeProps) {
  const router = useRouter();
  const { now } = useClock();
  const initialProposals = useMemo(() => [
    ...initialPendingProposals,
    ...initialAcceptedProposals,
  ], [initialPendingProposals, initialAcceptedProposals]);
  const { items: proposals, refreshError, hasLoaded, retry } = useRealtimeProposalList(
    initialProposals,
    getServiceProposalsAction,
    initialProposalsError
  );

  const pendingProposals = proposals.filter((proposal) => proposal.status === "pending");
  const currentTime = now().getTime();
  const acceptedProposals = proposals
    .filter((proposal) => proposal.status === "accepted" && Date.parse(proposal.scheduledOn) >= currentTime)
    .sort((a, b) => Date.parse(a.scheduledOn) - Date.parse(b.scheduledOn));

  const handleViewConversation = (proposal: ServiceProposalSummary) => {
    router.push(`/consumidor/mensajes?provider_id=${proposal.counterpart.id}`);
  };

  return (
    <div className="min-h-screen bg-brand-neutral/30 flex font-sans text-brand-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ConsumerHeader session={session} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto flex flex-col gap-6 lg:gap-8">
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
                {refreshError && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    data-testid="consumer-home-proposals-refresh-error"
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-caption"
                  >
                    <span>{t.notifications.refreshError.message}</span>
                    <Button size="sm" variant="brand" onClick={retry}>
                      {t.notifications.refreshError.retry}
                    </Button>
                  </div>
                )}
                {/* Carousel de Propuestas Pendientes */}
                {hasLoaded && <ProposalCarousel
                  config={{
                    title: t.serviceProposals.consumerHome.pendingTitle,
                    titleId: "pending-proposals-title",
                    icon: Clock,
                    iconColor: "text-amber-500",
                    badgeClass: "bg-amber-100 text-amber-800",
                    emptyMessage: t.serviceProposals.consumerHome.emptyPending,
                    prevLabel: t.serviceProposals.consumerHome.prevProposal,
                    nextLabel: t.serviceProposals.consumerHome.nextProposal,
                    activeDotClass: "bg-amber-500",
                  }}
                  proposals={pendingProposals}
                  onViewConversation={handleViewConversation}
                />}

                {/* Carousel de Servicios Próximos */}
                {hasLoaded && <ProposalCarousel
                  config={{
                    title: t.serviceProposals.consumerHome.acceptedTitle,
                    titleId: "accepted-proposals-title",
                    icon: CalendarCheck,
                    iconColor: "text-emerald-600",
                    badgeClass: "bg-emerald-100 text-emerald-800",
                    emptyMessage: t.serviceProposals.consumerHome.emptyAccepted,
                    prevLabel: t.serviceProposals.consumerHome.prevService,
                    nextLabel: t.serviceProposals.consumerHome.nextService,
                    activeDotClass: "bg-emerald-600",
                  }}
                  proposals={acceptedProposals}
                  onViewConversation={handleViewConversation}
                />}
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
