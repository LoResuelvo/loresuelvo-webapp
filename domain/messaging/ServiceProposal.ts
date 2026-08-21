import type { ServiceProposal as ServiceProposalType } from "./types";

export type ProposalStatus = "pending" | "accepted" | "rejected";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning";

function canBeAccepted(
  proposal: Pick<ServiceProposalType, "status">,
  isConsumer: boolean,
): boolean {
  return isConsumer && proposal.status === "pending";
}

function canBeRejected(
  proposal: Pick<ServiceProposalType, "status">,
  isConsumer: boolean,
): boolean {
  return isConsumer && proposal.status === "pending";
}

function isPending(proposal: Pick<ServiceProposalType, "status">): boolean {
  return proposal.status === "pending";
}

function isAccepted(proposal: Pick<ServiceProposalType, "status">): boolean {
  return proposal.status === "accepted";
}

function isRejected(proposal: Pick<ServiceProposalType, "status">): boolean {
  return proposal.status === "rejected";
}

function getStatusBadge(status: ProposalStatus | string): {
  label: string;
  variant: BadgeVariant;
} {
  switch (status) {
    case "pending":
      return { label: "Pendiente", variant: "warning" };
    case "accepted":
      return { label: "Aceptada", variant: "success" };
    case "rejected":
      return { label: "Rechazada", variant: "destructive" };
    default:
      return { label: status, variant: "default" };
  }
}

export const ServiceProposalModule = {
  canBeAccepted,
  canBeRejected,
  isPending,
  isAccepted,
  isRejected,
  getStatusBadge,
};

export const ServiceProposal = ServiceProposalModule;
