import { render, screen, within, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import WorkRequestsSection from "./WorkRequestsSection";
import { ProviderWorkRequest } from "@/domain/provider/types";
import * as actions from "@/app/prestador/home/actions";
import * as messagingActions from "@/app/prestador/mensajes/actions";
import * as NotificationContextModule from "@/infrastructure/notifications/NotificationContext";
import type { ResourceListener } from "@/infrastructure/notifications/NotificationContext";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/app/prestador/home/actions", () => ({
  acceptJobRequest: vi.fn(),
  rejectJobRequest: vi.fn(),
}));

vi.mock("@/app/prestador/mensajes/actions", () => ({
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
      id: 1,
      status: "pending",
      counterpart: { id: 2, role: "consumer", name: "Aylen", surname: "Suarez", categoryName: "Veterinaria" },
      messages: [],
      updated_on: "2026-05-31T12:00:00Z",
    });

    render(<WorkRequestsSection requests={mockWorkRequests} />);

    const viewButton = screen.getByRole("button", { name: "Ver Solicitud" });
    fireEvent.click(viewButton);

    const modal = screen.getByRole("dialog");
    const acceptButton = within(modal).getByRole("button", { name: "Continuar conversación" });

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

  it("renders image count indicator badge on the request item when images are present", () => {
    const requestsWithImages: ProviderWorkRequest[] = [
      {
        ...mockWorkRequests[0],
        images: [
          { id: "img-1", url: "http://example.com/img1.jpg", originalName: "leak.jpg" },
          { id: "img-2", url: "http://example.com/img2.jpg", originalName: "siphon.jpg" },
        ],
      },
    ];

    render(<WorkRequestsSection requests={requestsWithImages} />);

    const badge = screen.getByTestId("images-indicator");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("2 Imágenes");
  });

  it("does not render image count indicator badge when request has no images", () => {
    render(<WorkRequestsSection requests={mockWorkRequests} />);
    expect(screen.queryByTestId("images-indicator")).not.toBeInTheDocument();
  });

  it("renders attached images in RequestDetailModal when viewing request details", () => {
    const requestsWithImages: ProviderWorkRequest[] = [
      {
        ...mockWorkRequests[0],
        images: [
          { id: "img-1", url: "http://example.com/img1.jpg", originalName: "leak.jpg" },
        ],
      },
    ];

    render(<WorkRequestsSection requests={requestsWithImages} />);

    const viewButton = screen.getByRole("button", { name: "Ver Solicitud" });
    fireEvent.click(viewButton);

    expect(screen.getByText("Imágenes adjuntas")).toBeInTheDocument();
    expect(screen.getByAltText("leak.jpg")).toBeInTheDocument();
  });

  it("adds each incoming job request once when notifications arrive in a burst", () => {
    let capturedCallback: ResourceListener | undefined;
    vi.spyOn(NotificationContextModule, "useResourceUpdate").mockImplementation(
      (_type, _id, cb: ResourceListener) => {
        capturedCallback = cb;
      }
    );

    render(<WorkRequestsSection requests={mockWorkRequests} />);
    expect(screen.queryByText("Reparación urgente")).not.toBeInTheDocument();

    act(() => {
      capturedCallback?.(
        { id: 1, userId: 1, type: "job_request_received", resourceType: "job_request", resourceId: 99, createdAt: "2026-07-06T10:00:00-03:00" },
        {
          id: 99,
          conversationId: 50,
          title: "Reparación urgente",
          description: "Cañería rota",
          status: "pending",
          requester: { name: "Pedro", surname: "López" },
          images: [],
        }
      );
      capturedCallback?.(
        { id: 2, userId: 1, type: "job_request_received", resourceType: "job_request", resourceId: 100, createdAt: "2026-07-06T10:00:00-03:00" },
        {
          id: 100,
          conversationId: 51,
          title: "Presupuesto de pintura",
          description: "Paredes con humedad",
          status: "pending",
          requester: { name: "Lucía", surname: "Gómez" },
          images: [],
        }
      );
      capturedCallback?.(
        { id: 2, userId: 1, type: "job_request_received", resourceType: "job_request", resourceId: 100, createdAt: "2026-07-06T10:00:00-03:00" },
        {
          id: 100,
          conversationId: 51,
          title: "Presupuesto de pintura",
          description: "Paredes con humedad",
          status: "pending",
          requester: { name: "Lucía", surname: "Gómez" },
          images: [],
        }
      );
    });

    expect(screen.getByText("Reparación urgente")).toBeInTheDocument();
    expect(screen.getByText("Presupuesto de pintura")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
