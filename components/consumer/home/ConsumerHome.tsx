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
  return (
    <div className="min-h-screen bg-brand-neutral/30 flex font-sans text-brand-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ConsumerHeader session={session} />
        <main className="flex-1 p-8 lg:p-10 flex justify-center">
          <div className="max-w-6xl w-full flex flex-col gap-10">
            <DiagnosisHero />
                        {pendingProposals.length > 0 && (
              <section aria-labelledby="pending-proposals-title">
                <h2 id="pending-proposals-title" className="text-[26px] font-bold text-brand-primary mb-1">
                  {t.serviceProposals.consumerHome.pendingTitle}
                </h2>
                <p className="text-sm text-slate-500 mb-5">{t.serviceProposals.consumerHome.pendingSubtitle}</p>
                <div className="flex flex-col gap-4">
                  {pendingProposals.map(proposal => (
                    <ProposalCard key={proposal.id} proposal={proposal} isProvider={false} />
                  ))}
                </div>
              </section>
            )}

            {acceptedProposals.length > 0 && (
              <section aria-labelledby="accepted-proposals-title">
                <h2 id="accepted-proposals-title" className="text-[26px] font-bold text-brand-primary mb-5">
                  {t.serviceProposals.consumerHome.acceptedTitle}
                </h2>
                <div className="flex flex-col gap-4">
                  {acceptedProposals.map(proposal => (
                    <ProposalCard key={proposal.id} proposal={proposal} isProvider={false} />
                  ))}
                </div>
              </section>
            )}
            <CategoryGrid categories={categories} />
          </div>
        </main>
      </div>
    </div>
  );
}