export class TicketError extends Error {
  constructor(public readonly status: number) {
    super(`Unable to obtain WS ticket: ${status}`);
    this.name = "TicketError";
  }
}

export async function requestWsTicket(): Promise<string> {
  const res = await fetch("/api/ws-tickets", { method: "POST" });
  if (!res.ok) throw new TicketError(res.status);
  const data = await res.json();
  return data.ticket;
}
