"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ServiceProposalSummary } from "@/domain/messaging/types";
import { ProposalCard } from "@/components/messaging/proposals/ProposalCard";
import ServiceProposalDetailModal from "@/components/messaging/proposals/ServiceProposalDetailModal";
import { cn } from "@/lib/utils";

interface ProposalCarouselProps {
  title: string;
  subtitle?: string;
  titleId: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  badgeClass?: string;
  proposals: ServiceProposalSummary[];
  emptyMessage: string;
  prevLabel: string;
  nextLabel: string;
  activeDotClass?: string;
  onViewConversation: (proposal: ServiceProposalSummary) => void;
  className?: string;
}

export function ProposalCarousel({
  title,
  subtitle,
  titleId,
  icon: Icon,
  iconColor = "text-brand-primary",
  badgeClass: _badgeClass = "bg-slate-100 text-slate-800",
  proposals,
  emptyMessage,
  prevLabel,
  nextLabel,
  activeDotClass = "bg-brand-primary",
  onViewConversation,
  className,
}: ProposalCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedProposal, setSelectedProposal] = useState<ServiceProposalSummary | null>(null);

  const total = proposals.length;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
  };

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

          {total > 1 && (
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

            {total > 1 && (
              <div className="flex justify-center items-center gap-1.5 pt-1">
                {proposals.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
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
