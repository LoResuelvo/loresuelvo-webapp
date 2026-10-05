import { render, screen, fireEvent, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProposalHistoryView } from "./ProposalHistoryView";
import { getCurrentUserAction } from "@/app/api/me/actions";
import { ROUTES } from "@/lib/routes";
import { startCalendarAuthorizationAction } from "@/app/profile/calendar-actions";
import { getWorkOrderByProposalAction, getWorkOrderDetailAction } from "@/app/work-orders/actions";
import { t } from "@/infrastructure/i18n/translations";
import userEvent from "@testing-library/user-event";

vi.mock("@/app/api/me/actions", () => ({ getCurrentUserAction: vi.fn() }));
vi.mock("@/app/profile/calendar-actions", () => ({ startCalendarAuthorizationAction: vi.fn() }));
vi.mock("@/app/work-orders/actions", () => ({
  getWorkOrderByProposalAction: vi.fn().mockResolvedValue({ ok: true, workOrder: null }),
  getWorkOrderDetailAction: vi.fn().mockResolvedValue({ ok: false, status: 500 }),
}));

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
    vi.mocked(startCalendarAuthorizationAction).mockReset();
    vi.mocked(getWorkOrderByProposalAction).mockResolvedValue({ ok: true, workOrder: null });
    vi.mocked(getWorkOrderDetailAction).mockResolvedValue({ ok: false, status: 500 });
  });

  it.each([
    { isProvider: false, surface: "list" }, { isProvider: true, surface: "list" },
    { isProvider: false, surface: "detail" }, { isProvider: true, surface: "detail" },
  ])("retries a safe authorization failure in $surface for provider=$isProvider", async ({ isProvider, surface }) => {
    vi.mocked(getCurrentUserAction).mockResolvedValue({
      id: 10, firstName: "Ana", lastName: "Pérez", email: "ana@example.com",
      role: isProvider ? "provider" : "consumer", calendarConnectionStatus: "action_required",
    });
    const order = {
      id: 10, serviceProposalId: 2, consumerId: 10, providerId: 1, status: "scheduled" as const,
      amountCents: 2000000, scheduledOn: "2026-07-06T10:00:00-03:00", description: "Pintura",
      estimatedDurationMinutes: 90, acceptedOn: "2026-07-05T10:00:00Z",
    };
    vi.mocked(getWorkOrderByProposalAction).mockResolvedValue({ ok: true, workOrder: order });
    vi.mocked(getWorkOrderDetailAction).mockResolvedValue({ ok: true, detail: order });
    vi.mocked(startCalendarAuthorizationAction).mockResolvedValue({ ok: false, error: t.profile.calendar.authorizationError });
    render(<ProposalHistoryView proposals={[{
      ...mockProposals[1], counterpart: { ...mockProposals[1].counterpart, role: isProvider ? "consumer" : "provider" },
    }]} isProvider={isProvider} />);
    const user = userEvent.setup();
    await screen.findByRole("button", { name: t.profile.calendar.reauthorizeAction });
    await user.click(screen.getByRole("tab", { name: "Aceptadas" }));
    if (surface === "detail") {
      await user.click(screen.getByTestId("proposal-card"));
      await user.click(screen.getByRole("button", { name: /ver detalle de la orden/i }));
    }
    await user.click(screen.getByRole("button", { name: t.profile.calendar.reauthorizeAction }));
    expect(await screen.findByRole("alert")).toHaveTextContent(t.profile.calendar.authorizationError);
    if (surface === "list") {
      await user.click(screen.getByTestId("proposal-card"));
      await user.click(screen.getByRole("button", { name: /ver detalle de la orden/i }));
    }
    const modal = screen.getByTestId("work-order-detail-modal");
    expect(within(modal).getByRole("alert")).toHaveTextContent(t.profile.calendar.authorizationError);
    expect(screen.getAllByText(t.profile.calendar.authorizationError)).toHaveLength(1);
    expect(screen.queryByText("Internal calendar provider failure")).not.toBeInTheDocument();
    expect(within(modal).getByText("Pintura")).toBeInTheDocument();
    await user.click(within(modal).getByRole("button", { name: t.profile.calendar.reauthorizeAction }));
    expect(await within(modal).findByRole("alert")).toHaveTextContent(t.profile.calendar.authorizationError);
    expect(startCalendarAuthorizationAction).toHaveBeenCalledTimes(2);
    expect(getCurrentUserAction).toHaveBeenCalledTimes(1);
    expect(modal).toBeVisible();
    expect(within(modal).getByText("Pintura")).toBeInTheDocument();
  });

  it.each([false, true])("shares a single pending authorization between list and order detail ($0)", async (isProvider) => {
    vi.mocked(getCurrentUserAction).mockResolvedValue({
      id: 10, firstName: "Ana", lastName: "Pérez", email: "ana@example.com",
      role: isProvider ? "provider" : "consumer", calendarConnectionStatus: "action_required",
    });
    vi.mocked(startCalendarAuthorizationAction).mockReturnValue(new Promise(() => {}));
    render(<ProposalHistoryView proposals={[{
      ...mockProposals[1], counterpart: { ...mockProposals[1].counterpart, role: isProvider ? "consumer" : "provider" },
    }]} isProvider={isProvider} />);
    const user = userEvent.setup();
    const listAction = await screen.findByRole("button", { name: "Reautorizar Google Calendar" });

    await user.dblClick(listAction);
    expect(listAction).toBeDisabled();
    expect(listAction).toHaveAccessibleName("Conectando con Google Calendar…");
    await user.click(screen.getByRole("tab", { name: "Aceptadas" }));
    await user.click(screen.getByTestId("proposal-card"));
    await user.click(screen.getByRole("button", { name: /ver detalle de la orden/i }));

    expect(within(screen.getByTestId("work-order-detail-modal"))
      .getByRole("button", { name: "Conectando con Google Calendar…" })).toBeDisabled();
    expect(startCalendarAuthorizationAction).toHaveBeenCalledTimes(1);
    expect(getCurrentUserAction).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])("offers reauthorization in list and order detail with one account lookup ($0)", async (isProvider) => {
    const role = isProvider ? "provider" : "consumer";
    vi.mocked(getCurrentUserAction).mockResolvedValue({
      id: 10, firstName: "Ana", lastName: "Pérez", email: "ana@example.com",
      role, calendarConnectionStatus: "action_required",
    });
    render(<ProposalHistoryView proposals={[{
      ...mockProposals[1], counterpart: { ...mockProposals[1].counterpart, role: isProvider ? "consumer" : "provider" },
    }]} isProvider={isProvider} />);

    expect(await screen.findByRole("button", { name: "Reautorizar Google Calendar" })).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent("Google Calendar requiere autorización");
    fireEvent.click(screen.getByRole("tab", { name: "Aceptadas" }));
    fireEvent.click(screen.getByTestId("proposal-card"));
    fireEvent.click(screen.getByRole("button", { name: /ver detalle de la orden/i }));

    const detail = within(screen.getByTestId("work-order-detail-modal"));
    expect(detail.getByRole("status")).toHaveTextContent("Google Calendar requiere autorización");
    expect(detail.getByRole("button", { name: "Reautorizar Google Calendar" })).toBeEnabled();
    expect(getCurrentUserAction).toHaveBeenCalledTimes(1);
    expect(startCalendarAuthorizationAction).not.toHaveBeenCalled();
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
