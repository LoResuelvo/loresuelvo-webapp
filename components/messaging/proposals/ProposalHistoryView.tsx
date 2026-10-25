"use client";

import { useState, useMemo } from "react";
import { ServiceProposalSummary } from "@/domain/messaging/types";
import { ProposalCard } from "@/components/messaging/proposals/ProposalCard";
import ServiceProposalDetailModal from "@/components/messaging/proposals/ServiceProposalDetailModal";
import { t } from "@/infrastructure/i18n/translations";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import WorkOrderCalendarConnection from "@/components/work-orders/WorkOrderCalendarConnection";
import { useWorkOrderCalendarConnection } from "@/components/work-orders/useWorkOrderCalendarConnection";
import { ROUTES } from "@/lib/routes";
import { useCalendarAuthorization } from "@/components/profile/useCalendarAuthorization";
import { getServiceProposalsAction } from "@/app/prestador/mensajes/actions";
import { Button } from "@/components/ui/button";
import { useRealtimeProposalList } from "@/components/messaging/proposals/useRealtimeProposalList";

interface ProposalHistoryViewProps {
  proposals: ServiceProposalSummary[];
  isProvider: boolean;
}

type TabType = "pending" | "accepted" | "rejected";

export function ProposalHistoryView({ proposals: initialProposals, isProvider }: ProposalHistoryViewProps) {
  const { items: proposals, refreshError, retry } = useRealtimeProposalList(
    initialProposals,
    getServiceProposalsAction
  );
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [selectedProposalId, setSelectedProposalId] = useState<number | null>(null);
  const router = useRouter();
  const calendarConnection = useWorkOrderCalendarConnection();
  const calendarAuthorization = useCalendarAuthorization();


  const filteredProposals = useMemo(() => {
    return proposals
      .filter(p => p.status === activeTab)
      .sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime());
  }, [proposals, activeTab]);
  const selectedProposal = proposals.find((proposal) => proposal.id === selectedProposalId) ?? null;

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-title font-bold text-brand-primary">
          {isProvider ? t.sidebar.jobs : t.sidebar.services}
        </h1>
        <p className="text-body text-slate-600">{t.serviceProposals.sectionTitle}</p>
      </header>

      <WorkOrderCalendarConnection
        connection={calendarConnection}
        profileHref={isProvider ? ROUTES.provider.profile : ROUTES.consumer.profile}
        authorization={calendarAuthorization}
        showError={!selectedProposal}
      />

      {refreshError && (
        <div
          role="alert"
          aria-live="assertive"
          data-testid="proposal-refresh-error"
          className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-body"
        >
          <span>{t.notifications.refreshError.message}</span>
          <Button
            size="sm"
            variant="brand"
            onClick={retry}
            className="h-8 px-3 text-caption font-semibold"
          >
            {t.notifications.refreshError.retry}
          </Button>
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-200" role="tablist">
        {(["pending", "accepted", "rejected"] as TabType[]).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 font-medium text-sm transition-colors border-b-2 cursor-pointer",
              activeTab === tab
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-gray-500 hover:text-brand-primary hover:border-gray-300"
            )}
          >
            {t.serviceProposals.tabs[tab]}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="flex flex-col gap-4">
        <div data-testid="proposals-list" role="list" className="flex flex-col gap-4">
          {filteredProposals.length === 0 ? (
            <p className="text-center text-gray-500 py-10 bg-white rounded-xl shadow-sm border border-gray-100">
              {t.serviceProposals.emptyState}
            </p>
          ) : (
            filteredProposals.map((proposal) => (
              <div key={proposal.id} role="listitem">
                <ProposalCard 
                  proposal={proposal} 
                  isProvider={isProvider} 
                  onClick={() => setSelectedProposalId(proposal.id)}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {selectedProposal && (
        <ServiceProposalDetailModal
          proposal={selectedProposal}
          calendarConnection={calendarConnection}
          calendarAuthorization={calendarAuthorization}
          onClose={() => setSelectedProposalId(null)}
          onViewConversation={() => {
            const counterpartId = selectedProposal.counterpart.id;
            setSelectedProposalId(null);
            if (isProvider) {
              router.push(`/prestador/mensajes?consumer_id=${counterpartId}`);
            } else {
              router.push(`/consumidor/mensajes?provider_id=${counterpartId}`);
            }
          }}
        />
      )}
    </div>
  );
}
