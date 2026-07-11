export function formatAmountCents(amountCents: number): string {
  const amount = amountCents / 100;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
}

export function formatScheduledOn(isoDate: string): string {
  const date = new Date(isoDate);
  const formattedDate = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

  const formattedTime = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  return `${formattedDate} - ${formattedTime} hs`;
}

type StatusVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning";

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
