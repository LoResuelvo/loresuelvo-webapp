import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProposalHistoryView } from "./ProposalHistoryView";
import { getCurrentUserAction } from "@/app/api/me/actions";
import { ROUTES } from "@/lib/routes";

vi.mock("@/app/api/me/actions", () => ({ getCurrentUserAction: vi.fn() }));

const mockProposals = [
  {
    id: 1,
    conversationId: 2,
    amountCents: 1500000,
    scheduledOn: "2026-07-05T09:30:00-03:00",
    description: "Reparación",
    estimatedDurationMinutes: 60,
    status: "pending" as const,
    createdOn: "2026-07-04T10:00:00-03:00",
    counterpart: { id: 1, role: "consumer" as const, name: "Juan", surname: "Gómez" }
  },
  {
    id: 2,
    conversationId: 3,
    amountCents: 2000000,
    scheduledOn: "2026-07-06T10:00:00-03:00",
    description: "Pintura",
    estimatedDurationMinutes: 90,
    status: "accepted" as const,
    createdOn: "2026-07-05T10:00:00-03:00",
    counterpart: { id: 2, role: "consumer" as const, name: "Ana", surname: "Pérez" }
  }
];

describe("ProposalHistoryView", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserAction).mockReset();
    vi.mocked(getCurrentUserAction).mockReturnValue(new Promise(() => {}));
  });

  it.each([
    { isProvider: false, role: "consumer" as const, profileHref: ROUTES.consumer.profile },
    { isProvider: true, role: "provider" as const, profileHref: ROUTES.provider.profile },
  ])("invites a disconnected account to its role profile in the list ($role)", async ({ isProvider, role, profileHref }) => {
    vi.mocked(getCurrentUserAction).mockResolvedValue({
      id: 10, firstName: "Ana", lastName: "Pérez", email: "ana@example.com",
      role, calendarConnectionStatus: "disconnected",
    });
    render(<ProposalHistoryView proposals={mockProposals} isProvider={isProvider} />);

    expect(await screen.findByRole("link", { name: "Mi perfil" })).toHaveAttribute("href", profileHref);
    expect(screen.getByRole("status")).toHaveTextContent("Vinculá Google Calendar desde Mi perfil.");
    expect(getCurrentUserAction).toHaveBeenCalledTimes(1);
  });

  it("shares one account lookup across multiple cards and tab changes", async () => {
    vi.mocked(getCurrentUserAction).mockResolvedValue({
      id: 10, firstName: "Ana", lastName: "Pérez", email: "ana@example.com",
      role: "consumer", calendarConnectionStatus: "connected",
    });
    render(<ProposalHistoryView proposals={[
      mockProposals[0], { ...mockProposals[0], id: 3 }, mockProposals[1],
    ]} isProvider={false} />);

    expect(screen.getAllByTestId("proposal-card")).toHaveLength(2);
    expect(await screen.findByText("Google Calendar vinculado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Aceptadas" }));
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    expect(getCurrentUserAction).toHaveBeenCalledTimes(1);
  });

  it("renders proposals while the account lookup remains pending", () => {
    render(<ProposalHistoryView proposals={mockProposals} isProvider={true} />);

    expect(screen.getByText("Juan Gómez")).toBeInTheDocument();
    expect(screen.queryByText("Google Calendar vinculado")).not.toBeInTheDocument();
  });

  it("renders tabs and section title", () => {
    render(<ProposalHistoryView proposals={[]} isProvider={true} />);
    expect(screen.getByText("Propuestas de Servicio")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Pendientes" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Aceptadas" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Rechazadas" })).toBeInTheDocument();
  });

  it("renders empty state when no proposals match the tab", () => {
    render(<ProposalHistoryView proposals={[]} isProvider={true} />);
    expect(screen.getByText("No tenés propuestas de servicio")).toBeInTheDocument();
  });

  it("renders proposals matching the default pending tab", () => {
    render(<ProposalHistoryView proposals={mockProposals} isProvider={true} />);
    expect(screen.getByText("Juan Gómez")).toBeInTheDocument();
    expect(screen.queryByText("Ana Pérez")).not.toBeInTheDocument();
  });

  it("filters proposals when clicking tabs", () => {
    render(<ProposalHistoryView proposals={mockProposals} isProvider={true} />);
    
    const acceptedTab = screen.getByRole("tab", { name: "Aceptadas" });
    fireEvent.click(acceptedTab);
    
    expect(screen.queryByText("Juan Gómez")).not.toBeInTheDocument();
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
  });

  it("opens proposal detail modal when clicking a proposal card", () => {
    render(<ProposalHistoryView proposals={mockProposals} isProvider={true} />);
    
    const card = screen.getByTestId("proposal-card");
    fireEvent.click(card);

    expect(screen.getByTestId("service-proposal-detail-modal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ver conversación/i })).toBeInTheDocument();
  });
});
