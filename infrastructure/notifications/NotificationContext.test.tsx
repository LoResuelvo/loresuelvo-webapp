import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  NotificationProvider,
  useNotifications,
  useResourceUpdate,
} from "./NotificationContext";
import type { ResourceListener } from "./NotificationContext";
import type { WsEvent } from "@/infrastructure/websocket/types";

let mockWsSubscriber: ((event: WsEvent) => void) | null = null;
const mockSubscribe = vi.fn((handler: (event: WsEvent) => void) => {
  mockWsSubscriber = handler;
  return () => {
    mockWsSubscriber = null;
  };
});

vi.mock("@/infrastructure/websocket", () => ({
  useWebSocket: () => ({
    subscribe: mockSubscribe,
    unreadCount: 0,
    resetUnread: vi.fn(),
  }),
}));

const mockStartAuthorization = vi.fn();
let mockCalendarAuthorizationPending = false;
let mockCalendarAuthorizationError: string | null = null;
vi.mock("@/components/profile/useCalendarAuthorization", () => ({
  useCalendarAuthorization: () => ({
    isAuthorizing: mockCalendarAuthorizationPending,
    error: mockCalendarAuthorizationError,
    startAuthorization: mockStartAuthorization,
  }),
}));

function TestConsumer() {
  const { notices, dismissNotice, activeModalWorkOrderId, openWorkOrderDetail } = useNotifications();
  return (
    <div>
      <div data-testid="active-modal">{activeModalWorkOrderId ?? "none"}</div>
      <button onClick={() => openWorkOrderDetail(42)}>Open 42</button>
      <div data-testid="notices-count">{notices.length}</div>
      {notices.map((n) => (
        <div key={n.id} data-testid={`notice-${n.id}`}>
          <span>{n.title}</span>
          <span>{n.description}</span>
          {n.actionError && <span role="alert">{n.actionError}</span>}
          {n.actionLabel && (
            <button
              onClick={n.onAction}
              disabled={n.isActionPending}
              data-testid={`action-${n.id}`}
            >
              {n.isActionPending ? "Conectando con Google Calendar…" : n.actionLabel}
            </button>
          )}
          <button onClick={() => dismissNotice(n.id)}>Dismiss</button>
        </div>
      ))}
    </div>
  );
}

function ResourceListenerConsumer({
  resourceType,
  resourceId,
  onUpdate,
}: {
  resourceType: "job_request" | "service_proposal" | "work_order" | "calendar_connection";
  resourceId?: number;
  onUpdate: ResourceListener;
}) {
  useResourceUpdate(resourceType, resourceId, onUpdate);
  return <div>Listener</div>;
}

describe("NotificationContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWsSubscriber = null;
    mockCalendarAuthorizationPending = false;
    mockCalendarAuthorizationError = null;
    mockStartAuthorization.mockReset();
  });

  it("queues actionable notice for work_order_close_to_scheduled_time", () => {
    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    act(() => {
      mockWsSubscriber?.({
        type: "notification.created",
        notification: {
          id: 1,
          user_id: 10,
          type: "work_order_close_to_scheduled_time",
          resource_type: "work_order",
          resource_id: 99,
          created_at: "2026-10-15T12:00:00Z",
        },
      });
    });

    expect(screen.getByTestId("notices-count")).toHaveTextContent("1");
    expect(screen.getByText("Servicio próximo a iniciar")).toBeInTheDocument();
  });

  it("clicking action on work order reminder opens modal and dismisses notice", async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    act(() => {
      mockWsSubscriber?.({
        type: "notification.created",
        notification: {
          id: 1,
          user_id: 10,
          type: "work_order_close_to_scheduled_time",
          resource_type: "work_order",
          resource_id: 99,
          created_at: "2026-10-15T12:00:00Z",
        },
      });
    });

    const actionButton = screen.getByTestId("action-id:1");
    await user.click(actionButton);

    expect(screen.getByTestId("active-modal")).toHaveTextContent("99");
    expect(screen.getByTestId("notices-count")).toHaveTextContent("0");
  });

  it("queues actionable notice for calendar_reauthorization_required with id 0 and deduplicates", async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    act(() => {
      mockWsSubscriber?.({
        type: "notification.created",
        notification: {
          id: 0,
          user_id: 10,
          type: "calendar_reauthorization_required",
          resource_type: "calendar_connection",
          resource_id: 10,
          created_at: "2026-10-15T12:00:01Z",
        },
      });
      // Send duplicate
      mockWsSubscriber?.({
        type: "notification.created",
        notification: {
          id: 0,
          user_id: 10,
          type: "calendar_reauthorization_required",
          resource_type: "calendar_connection",
          resource_id: 10,
          created_at: "2026-10-15T12:00:00Z",
        },
      });
    });

    // Should only have 1 notice despite duplicate
    expect(screen.getByTestId("notices-count")).toHaveTextContent("1");
    expect(screen.getByText("Reautorización requerida")).toBeInTheDocument();

    const actionButton = screen.getByRole("button", { name: "Reautorizar" });
    mockStartAuthorization.mockResolvedValue(true);
    await user.click(actionButton);

    expect(mockStartAuthorization).toHaveBeenCalled();
  });

  it("keeps a failed calendar reauthorization available for retry and reflects pending state", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    act(() => {
      mockWsSubscriber?.({
        type: "notification.created",
        notification: {
          id: 0,
          user_id: 10,
          type: "calendar_reauthorization_required",
          resource_type: "calendar_connection",
          resource_id: 10,
          created_at: "2026-10-15T12:00:00Z",
        },
      });
    });

    let completeAuthorization: ((started: boolean) => void) | undefined;
    mockStartAuthorization.mockImplementation(() => {
      mockCalendarAuthorizationPending = true;
      return new Promise<boolean>((resolve) => {
        completeAuthorization = resolve;
      });
    });

    await user.click(screen.getByRole("button", { name: "Reautorizar" }));
    rerender(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );
    expect(screen.getByRole("button", { name: "Conectando con Google Calendar…" })).toBeDisabled();

    mockCalendarAuthorizationPending = false;
    mockCalendarAuthorizationError = "No se pudo iniciar la autorización";
    await act(async () => {
      completeAuthorization?.(false);
    });
    rerender(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo iniciar la autorización");
    expect(screen.getByTestId("notices-count")).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: "Reautorizar" })).toBeEnabled();

    mockCalendarAuthorizationError = null;
    mockStartAuthorization.mockResolvedValue(true);
    await user.click(screen.getByRole("button", { name: "Reautorizar" }));

    expect(screen.getByTestId("notices-count")).toHaveTextContent("0");
    expect(mockStartAuthorization).toHaveBeenCalledTimes(2);
  });

  it("dispatches each distinct resource update once and cancels pending work on unmount", () => {
    vi.useFakeTimers();
    const handleUpdate = vi.fn();

    const { unmount } = render(
      <NotificationProvider>
        <ResourceListenerConsumer
          resourceType="work_order"
          resourceId={50}
          onUpdate={handleUpdate}
        />
      </NotificationProvider>
    );

    const firstEvent: WsEvent = {
      type: "notification.created",
      notification: {
        id: 201,
        user_id: 10,
        type: "work_order_completion_reported",
        resource_type: "work_order",
        resource_id: 50,
        created_at: "2026-10-15T12:00:00Z",
      },
    };
    const secondEvent: WsEvent = {
      type: "notification.created",
      notification: {
        id: 202,
        user_id: 10,
        type: "work_order_final_payment_approved",
        resource_type: "work_order",
        resource_id: 50,
        created_at: "2026-10-15T12:05:00Z",
      },
    };

    act(() => {
      mockWsSubscriber?.(firstEvent);
      mockWsSubscriber?.(secondEvent);
      mockWsSubscriber?.(secondEvent);
    });

    expect(handleUpdate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(handleUpdate.mock.calls.map(([event]) => event.id)).toEqual([201, 202]);

    act(() => {
      mockWsSubscriber?.({
        type: "notification.created",
        notification: {
          id: 203,
          user_id: 10,
          type: "work_order_final_payment_approved",
          resource_type: "work_order",
          resource_id: 50,
          created_at: "2026-10-15T12:10:00Z",
        },
      });
    });

    unmount();

    act(() => {
      vi.runAllTimers();
    });

    expect(handleUpdate.mock.calls.map(([event]) => event.id)).toEqual([201, 202]);
    vi.useRealTimers();
  });
});
