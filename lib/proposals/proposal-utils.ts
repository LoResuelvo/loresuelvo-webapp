import { Money } from "@/domain/shared/Money";
import { ScheduledDateTime } from "@/domain/shared/ScheduledDateTime";

export function formatAmountCents(amountCents: number): string {
  return Money.format(Money.create(amountCents));
}

export function formatScheduledOn(isoDate: string): string {
  return ScheduledDateTime.formatWithTime(ScheduledDateTime.create(isoDate));
}

export function formatProposalTime(isoDate: string): string {
  return ScheduledDateTime.formatRawTime(ScheduledDateTime.create(isoDate));
}

export type StatusVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning";

export function getStatusBadge(status: string): { label: string; variant: StatusVariant } {
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
