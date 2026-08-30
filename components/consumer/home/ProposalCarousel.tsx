"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ServiceProposalSummary } from "@/domain/messaging/types";
import { ProposalCard } from "@/components/messaging/proposals/ProposalCard";
import ServiceProposalDetailModal from "@/components/messaging/proposals/ServiceProposalDetailModal";
import { useCarouselNavigation } from "@/hooks/useCarouselNavigation";
import { cn } from "@/lib/utils";

export interface CarouselConfig {
  title: string;
  subtitle?: string;
  titleId: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  badgeClass?: string;
  emptyMessage: string;
  prevLabel: string;
  nextLabel: string;
  activeDotClass?: string;
}

export interface ProposalCarouselProps {
  config: CarouselConfig;
  proposals: ServiceProposalSummary[];
  onViewConversation: (proposal: ServiceProposalSummary) => void;
  className?: string;
}

export function ProposalCarousel({
  config,
  proposals,
  onViewConversation,
  className,
}: ProposalCarouselProps) {
  const [selectedProposal, setSelectedProposal] = useState<ServiceProposalSummary | null>(null);
  const total = proposals.length;
  const { currentIndex, handlePrev, handleNext, goToIndex, hasNavigation } = useCarouselNavigation(total);

  const {
    title,
    subtitle,
    titleId,
    icon: Icon,
    iconColor = "text-brand-primary",
    emptyMessage,
    prevLabel,
    nextLabel,
    activeDotClass = "bg-brand-primary",
  } = config;

  return (
    <>
      <section aria-labelledby={titleId} role="region" className={cn("w-full", className)}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Icon className={cn("w-5 h-5 shrink-0", iconColor)} aria-hidden="true" />
              <h2 id={titleId} className="text-title font-bold text-brand-primary">
                {title}
              </h2>
            </div>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          {hasNavigation && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrev}
                className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-brand-primary transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary shadow-2xs cursor-pointer"
                aria-label={prevLabel}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-slate-500 px-1 text-center min-w-[34px]">
                {currentIndex + 1}/{total}
              </span>
              <button
                type="button"
                onClick={handleNext}
                className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-brand-primary transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary shadow-2xs cursor-pointer"
                aria-label={nextLabel}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {total === 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-dashed border-slate-200 text-center shadow-xs">
            <p className="text-sm text-slate-400 font-medium">
              {emptyMessage}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-2xl">
              <div
                className="flex transition-transform duration-300 ease-out items-stretch"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {proposals.map((proposal) => (
                  <div key={proposal.id} className="w-full flex-shrink-0 overflow-hidden h-full">
                    <ProposalCard
                      proposal={proposal}
                      isProvider={false}
                      className="h-full"
                      onClick={() => setSelectedProposal(proposal)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {hasNavigation && (
              <div className="flex justify-center items-center gap-1.5 pt-1">
                {proposals.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => goToIndex(idx)}
                    aria-label={`Ir a tarjeta ${idx + 1}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                      currentIndex === idx ? cn("w-5", activeDotClass) : "w-1.5 bg-slate-300 hover:bg-slate-400"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {selectedProposal && (
        <ServiceProposalDetailModal
          proposal={selectedProposal}
          onClose={() => setSelectedProposal(null)}
          onViewConversation={() => {
            const prop = selectedProposal;
            setSelectedProposal(null);
            onViewConversation(prop);
          }}
        />
      )}
    </>
  );
}

export default ProposalCarousel;
