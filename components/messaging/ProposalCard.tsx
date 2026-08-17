import React from "react";
import { ServiceProposalSummary } from "@/domain/messaging/types";
import { formatAmountCents, formatScheduledOn, getStatusBadge } from "@/lib/proposal-utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { getInitials } from "@/lib/text-utils";
import { cn } from "@/lib/utils";

interface ProposalCardProps {
  proposal: ServiceProposalSummary;
  onViewConversation?: (conversationId: number) => void;
  isProvider: boolean;
  className?: string;
}

export function ProposalCard({ proposal, onViewConversation, isProvider, className }: ProposalCardProps) {
  const { counterpart } = proposal;
  const statusBadge = getStatusBadge(proposal.status);
  
  // Si el que mira la tarjeta es el consumidor, el counterpart es el prestador, y viceversa
  const displayName = `${counterpart.name} ${counterpart.surname}`.trim() || "Usuario";
  const initials = getInitials(displayName);
  const displayCategory = !isProvider && counterpart.categoryName ? counterpart.categoryName : null;

  return (
    <div 
      className={cn(
        "bg-card flex flex-col justify-between gap-4 rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
      data-testid="proposal-card"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar 
              className="border shrink-0"
              size="sm"
              src={counterpart.profilePhotoUrl} 
              alt={displayName}
              initials={initials}
              imgTestId="proposal-card-avatar"
              fallbackTestId="proposal-card-avatar-fallback"
            />
            
            <div className="flex flex-col min-w-0">
              <h3 className="text-foreground text-sm font-semibold leading-none truncate">{displayName}</h3>
              {displayCategory && (
                <span 
                  className="text-muted-foreground mt-1 text-xs truncate" 
                  data-testid="proposal-category"
                >
                  {displayCategory}
                </span>
              )}
            </div>
          </div>

          <Badge variant={statusBadge.variant} className="shrink-0 whitespace-nowrap px-2.5 py-0.5">
            {statusBadge.label}
          </Badge>
        </div>

        <div className="bg-muted/30 grid grid-cols-2 gap-3 rounded-lg p-3">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">Monto</span>
            <span className="text-foreground text-sm font-semibold">
              {formatAmountCents(proposal.amountCents)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">Fecha y hora</span>
            <span className="text-foreground text-sm font-medium">
              {formatScheduledOn(proposal.scheduledOn)}
            </span>
          </div>
        </div>

        {proposal.description && (
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">Descripción</span>
            <p 
              className="text-foreground/90 text-sm leading-relaxed line-clamp-2 break-words" 
              data-testid="proposal-description"
              title={proposal.description}
            >
              {proposal.description}
            </p>
          </div>
        )}
      </div>

      {onViewConversation && (
        <div className="mt-1 flex w-full pt-1">
          <Button 
            variant="outline" 
            className="w-full gap-2 font-medium cursor-pointer"
            onClick={() => onViewConversation(proposal.conversationId)}
          >
            <MessageCircle className="h-4 w-4" />
            Ver conversación
          </Button>
        </div>
      )}
    </div>
  );
}
