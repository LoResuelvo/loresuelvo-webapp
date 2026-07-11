"use client";

import { useState, useMemo } from "react";
import { ServiceProposalSummary } from "@/domain/messaging/types";
import { ProposalCard } from "@/components/messaging/ProposalCard";
import { t } from "@/infrastructure/i18n/translations";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface ProposalHistoryViewProps {
  proposals: ServiceProposalSummary[];
  isProvider: boolean;
}

type TabType = "pending" | "accepted" | "rejected";

export function ProposalHistoryView({ proposals, isProvider }: ProposalHistoryViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const router = useRouter();

  const filteredProposals = useMemo(() => {
    return proposals
      .filter(p => p.status === activeTab)
      .sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime());
  }, [proposals, activeTab]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-brand-primary">
        {t.serviceProposals.sectionTitle}
      </h1>

      <div className="flex gap-2 border-b border-gray-200" role="tablist">
        {(["pending", "accepted", "rejected"] as TabType[]).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 font-medium text-sm transition-colors border-b-2",
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
                  onViewConversation={() => {
                    if (isProvider) {
                      router.push(`/prestador/mensajes?consumer_id=${proposal.counterpart.id}`);
                    } else {
                      router.push(`/consumidor/mensajes?provider_id=${proposal.counterpart.id}`);
                    }
                  }}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
