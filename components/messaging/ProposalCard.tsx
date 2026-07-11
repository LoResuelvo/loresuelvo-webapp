import React from "react";
import { ServiceProposalSummary } from "@/domain/messaging/types";
import { formatAmountCents, formatScheduledOn, getStatusBadge } from "@/lib/proposal-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, MessageCircle } from "lucide-react";
import { getInitials } from "@/lib/text-utils";

interface ProposalCardProps {
  proposal: ServiceProposalSummary;
  onViewConversation?: (conversationId: number) => void;
  isProvider: boolean;
}

export function ProposalCard({ proposal, onViewConversation, isProvider }: ProposalCardProps) {
  const { counterpart } = proposal;
  const statusBadge = getStatusBadge(proposal.status);
  
  // Si el que mira la tarjeta es el consumidor, el counterpart es el prestador, y viceversa
  const displayName = `${counterpart.name} ${counterpart.surname}`.trim() || "Usuario";
  const initials = getInitials(displayName);
  const displayCategory = !isProvider && counterpart.categoryName ? counterpart.categoryName : null;

  return (
    <div 
      className="bg-card flex flex-col gap-4 rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md"
      data-testid="proposal-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border" data-testid="proposal-card-avatar">
            {counterpart.profilePhotoUrl ? (
              <AvatarImage src={counterpart.profilePhotoUrl} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-muted text-muted-foreground">
              {initials || <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col">
            <h3 className="text-foreground text-sm font-semibold leading-none">{displayName}</h3>
            {displayCategory && (
              <span 
                className="text-muted-foreground mt-1 text-xs" 
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
            className="text-foreground/90 text-sm leading-relaxed" 
            data-testid="proposal-description"
          >
            {proposal.description}
          </p>
        </div>
      )}

      {onViewConversation && (
        <div className="mt-2 flex w-full pt-2">
          <Button 
            variant="outline" 
            className="w-full gap-2 font-medium"
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
