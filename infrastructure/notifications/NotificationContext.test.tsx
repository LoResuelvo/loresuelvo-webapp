import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  NotificationProvider,
  useNotifications,
  useResourceUpdate,
} from "./NotificationContext";
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
vi.mock("@/components/profile/useCalendarAuthorization", () => ({
  useCalendarAuthorization: () => ({
    isAuthorizing: false,
    error: null,
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
          {n.actionLabel && (
            <button onClick={n.onAction} data-testid={`action-${n.id}`}>
              {n.actionLabel}
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
  onUpdate: (event: any) => void;
}) {
  useResourceUpdate(resourceType, resourceId, onUpdate, 0);
  return <div>Listener</div>;
}

describe("NotificationContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWsSubscriber = null;
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
          created_at: "2026-10-15T12:00:00Z",
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
    await user.click(actionButton);

    expect(mockStartAuthorization).toHaveBeenCalled();
  });

  it("dispatches resource update to mounted listeners and cleans up on unmount", async () => {
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

    act(() => {
      mockWsSubscriber?.({
        type: "notification.created",
        notification: {
          id: 201,
          user_id: 10,
          type: "work_order_completion_reported",
          resource_type: "work_order",
          resource_id: 50,
          created_at: "2026-10-15T12:00:00Z",
        },
      });
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(handleUpdate).toHaveBeenCalledTimes(1);

    unmount();

    act(() => {
      mockWsSubscriber?.({
        type: "notification.created",
        notification: {
          id: 202,
          user_id: 10,
          type: "work_order_final_payment_approved",
          resource_type: "work_order",
          resource_id: 50,
          created_at: "2026-10-15T12:05:00Z",
        },
      });
      vi.runAllTimers();
    });

    // Should still be 1 because it unmounted
    expect(handleUpdate).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
