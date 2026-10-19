import { render, screen, within, fireEvent, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ScheduledJobsSection from "./ScheduledJobsSection";
import { ServiceProposalSummary } from "@/domain/messaging/types";
import { getServiceProposalsAction } from "@/app/prestador/mensajes/actions";
import * as NotificationContextModule from "@/infrastructure/notifications/NotificationContext";
import type { ResourceListener } from "@/infrastructure/notifications/NotificationContext";
import { t } from "@/infrastructure/i18n/translations";

vi.mock("@/app/prestador/mensajes/actions", () => ({
  getServiceProposalsAction: vi.fn(),
}));

vi.mock("@/components/messaging/proposals/ServiceProposalDetailModal", () => ({
  default: ({ proposal, onViewConversation }: {
    proposal: ServiceProposalSummary;
    onViewConversation?: (conversationId: number) => void;
  }) => (
    <div data-testid="service-proposal-detail-modal">
      <span>{proposal.description}</span>
      <button onClick={() => onViewConversation?.(proposal.conversationId)}>
        Ver conversación
      </button>
    </div>
  ),
}));

const mockScheduledJobs: ServiceProposalSummary[] = [
  {
    id: 1,
    conversationId: 42,
    amountCents: 4500000,
    scheduledOn: "2026-07-05T10:00:00Z",
    description: "Reparación de grifería",
    estimatedDurationMinutes: 60,
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
    estimatedDurationMinutes: 120,
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
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(getServiceProposalsAction).mockReset();
  });

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

  it("opens proposal detail modal when clicking a scheduled job card", () => {
    render(<ScheduledJobsSection jobs={mockScheduledJobs} />);
    
    const cards = screen.getAllByTestId("proposal-card");
    fireEvent.click(cards[0]);

    expect(screen.getByTestId("service-proposal-detail-modal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ver conversación/i })).toBeInTheDocument();
  });

  it("refreshes mounted jobs and updates the open detail after a realtime event", async () => {
    let capturedCallback: ResourceListener | undefined;
    vi.spyOn(NotificationContextModule, "useResourceUpdate").mockImplementation(
      (_type, _id, callback: ResourceListener) => {
        capturedCallback = callback;
      }
    );
    const refreshedJobs: ServiceProposalSummary[] = [
      { ...mockScheduledJobs[0], description: "Reparación actualizada" },
      mockScheduledJobs[1],
      {
        ...mockScheduledJobs[0],
        id: 3,
        conversationId: 44,
        description: "Nuevo trabajo agendado",
        counterpart: { ...mockScheduledJobs[0].counterpart, id: 7, name: "Marta", surname: "Ríos" },
      },
    ];
    vi.mocked(getServiceProposalsAction).mockResolvedValue(refreshedJobs);

    const user = userEvent.setup();
    render(<ScheduledJobsSection jobs={mockScheduledJobs} />);
    expect(within(screen.getByRole("list", { name: "Lista de trabajos agendados" }))
      .getAllByRole("listitem")).toHaveLength(2);
    await user.click(screen.getAllByTestId("proposal-card")[0]);
    const modal = within(screen.getByTestId("service-proposal-detail-modal"));
    expect(modal.getByText("Reparación de grifería")).toBeInTheDocument();

    await act(async () => {
      capturedCallback?.({
        id: 30,
        userId: 1,
        type: "service_proposal_accepted",
        resourceType: "service_proposal",
        resourceId: 3,
        createdAt: "2026-07-06T10:00:00-03:00",
      });
    });

    expect(await modal.findByText("Reparación actualizada")).toBeInTheDocument();
    expect(await screen.findByText("Marta Ríos")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Lista de trabajos agendados" }))
      .getAllByRole("listitem")).toHaveLength(3);
    expect(modal.queryByText("Reparación de grifería")).not.toBeInTheDocument();
  });

  it("preserves scheduled jobs and allows retry after a refresh failure", async () => {
    let capturedCallback: ResourceListener | undefined;
    vi.spyOn(NotificationContextModule, "useResourceUpdate").mockImplementation(
      (_type, _id, callback: ResourceListener) => {
        capturedCallback = callback;
      }
    );
    const recoveredJob: ServiceProposalSummary = {
      ...mockScheduledJobs[0],
      id: 3,
      conversationId: 44,
      description: "Trabajo recuperado",
      counterpart: { ...mockScheduledJobs[0].counterpart, id: 7, name: "Marta", surname: "Ríos" },
    };
    vi.mocked(getServiceProposalsAction)
      .mockRejectedValueOnce(new Error("Network failed"))
      .mockResolvedValueOnce([...mockScheduledJobs, recoveredJob]);

    render(<ScheduledJobsSection jobs={mockScheduledJobs} />);
    await act(async () => {
      capturedCallback?.({
        id: 31,
        userId: 1,
        type: "work_order_final_payment_approved",
        resourceType: "work_order",
        resourceId: 1,
        createdAt: "2026-07-06T10:00:00-03:00",
      });
    });

    expect(screen.getByText("Reparación de grifería")).toBeInTheDocument();
    expect(await screen.findByTestId("scheduled-jobs-refresh-error")).toHaveTextContent(
      t.notifications.refreshError.message
    );

    await userEvent.setup().click(screen.getByRole("button", { name: t.notifications.refreshError.retry }));
    expect(await screen.findByText("Marta Ríos")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId("scheduled-jobs-refresh-error")).not.toBeInTheDocument());
    expect(within(screen.getByRole("list", { name: "Lista de trabajos agendados" }))
      .getAllByRole("listitem")).toHaveLength(3);
  });
});
