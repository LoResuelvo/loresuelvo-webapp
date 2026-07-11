import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ScheduledJobsSection from "./ScheduledJobsSection";
import { ServiceProposalSummary } from "@/domain/messaging/types";

const mockScheduledJobs: ServiceProposalSummary[] = [
  {
    id: 1,
    conversationId: 42,
    amountCents: 4500000,
    scheduledOn: "2026-07-05T10:00:00Z",
    description: "Reparación de grifería",
    status: "accepted",
    createdOn: "2026-07-04T10:00:00Z",
    counterpart: {
      id: 5,
      role: "consumer",
      name: "Carlos",
      surname: "Méndez",
    }
  },
  {
    id: 2,
    conversationId: 43,
    amountCents: 8000000,
    scheduledOn: "2026-07-06T14:30:00Z",
    description: "Instalación de aire acondicionado",
    status: "accepted",
    createdOn: "2026-07-04T10:00:00Z",
    counterpart: {
      id: 6,
      role: "consumer",
      name: "Laura",
      surname: "Pérez",
    }
  },
];

describe("ScheduledJobsSection", () => {
  it("shows empty state message when there are no scheduled jobs", () => {
    render(<ScheduledJobsSection jobs={[]} />);

    const section = screen.getByRole("region", { name: "Trabajos Agendados" });
    expect(within(section).getByText("No tienes trabajos agendados")).toBeInTheDocument();
  });

  it("renders scheduled jobs using ProposalCard", () => {
    render(<ScheduledJobsSection jobs={mockScheduledJobs} />);

    const section = screen.getByRole("region", { name: "Trabajos Agendados" });
    const list = within(section).getByRole("list", { name: "Lista de trabajos agendados" });
    const items = within(list).getAllByRole("listitem");

    expect(items).toHaveLength(2);

    const firstJob = items[0];
    expect(within(firstJob).getByText("Reparación de grifería")).toBeInTheDocument();
    expect(within(firstJob).getByText("Carlos Méndez")).toBeInTheDocument();
    expect(within(firstJob).getByText("$ 45.000,00")).toBeInTheDocument();
    expect(within(firstJob).getByText("Aceptada")).toBeInTheDocument();
  });
});