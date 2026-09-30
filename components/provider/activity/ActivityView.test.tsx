import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActivityView } from "./ActivityView";
import type { ProviderActivity } from "@/domain/provider/activity";

const activity: ProviderActivity = {
  period: { from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00", granularity: "day", timeZone: "America/Argentina/Buenos_Aires" },
  calculatedAt: "2026-08-31T00:00:00-03:00",
  results: { confirmedBookings: 4, reportedCompletions: 3, fullyPaidWorkOrders: 2, clientsServed: 3, newClients: 2, returningClients: 1, agreedValueCents: 12000000, averageValueCents: 4000000, currency: "ARS" },
  evolution: [{ from: "2026-08-01T00:00:00-03:00", to: "2026-08-02T00:00:00-03:00", confirmedBookings: 0, reportedCompletions: 0, fullyPaidWorkOrders: 0 }],
  currentPending: { requests: 7, scheduledOrders: 8, awaitingPaymentOrders: 9 },
};

describe("ActivityView", () => {
  it("shows API results, client split, contractual money and zero intervals", () => {
    render(<ActivityView activity={activity} />);
    expect(screen.getByText("Clientes nuevos").nextElementSibling).toHaveTextContent("2");
    expect(screen.getByText("Clientes recurrentes").nextElementSibling).toHaveTextContent("1");
    expect(screen.getByText("Valor pactado de trabajos finalizados").nextElementSibling).toHaveTextContent("120.000,00");
    expect(screen.getByText("Importe promedio de trabajos finalizados").nextElementSibling).toHaveTextContent("40.000,00");
    expect(within(screen.getByRole("table")).getAllByRole("cell")).toHaveLength(3);
    within(screen.getByRole("table")).getAllByRole("cell").forEach(cell => expect(cell).toHaveTextContent("0"));
  });
});
