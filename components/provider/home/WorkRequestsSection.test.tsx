import { render, screen, within, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import WorkRequestsSection from "./WorkRequestsSection";
import { ProviderWorkRequest } from "@/lib/provider-home/types";
import * as actions from "./actions";
import * as messagingActions from "@/components/provider/messages/actions";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("./actions", () => ({
  acceptJobRequest: vi.fn(),
  rejectJobRequest: vi.fn(),
}));

vi.mock("@/components/provider/messages/actions", () => ({
  getConversationDetail: vi.fn(),
}));

const mockWorkRequests: ProviderWorkRequest[] = [
  {
    id: "7",
    conversationId: "10",
    clientName: "Aylen Suarez",
    problemTitle: "Perro rabioso",
    category: "Veterinaria",
    description: "Necesito atención para mi perro",
    location: "Palermo, CABA",
    publishedAtLabel: "Hace 20 min",
    unreadMessagesCount: 0,
  },
];

describe("WorkRequestsSection handleAccept redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
  });

  it("after accepting a work request, redirects to chat with consumer", async () => {
    (actions.acceptJobRequest as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (messagingActions.getConversationDetail as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10,
      status: "pending",
      counterpart: { id: 2, role: "consumer", name: "Aylen", surname: "Suarez", category_name: "Veterinaria" },
      messages: [],
      updated_on: "2026-06-03T22:07:05.800829Z",
    });

    render(<WorkRequestsSection requests={mockWorkRequests} />);

    const viewButton = screen.getByRole("button", { name: "Ver Solicitud" });
    fireEvent.click(viewButton);

    const modal = screen.getByRole("dialog");
    const acceptButton = within(modal).getByRole("button", { name: "Aceptar Solicitud" });

    await act(async () => {
      fireEvent.click(acceptButton);
    });

    await waitFor(() => {
      expect(actions.acceptJobRequest).toHaveBeenCalledWith("7");
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/prestador/mensajes?consumer_id=2");
    });
  });
});