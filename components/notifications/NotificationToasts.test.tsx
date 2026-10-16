import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { NotificationToasts } from "./NotificationToasts";
import type { ActionableNotice } from "@/infrastructure/notifications/NotificationContext";

const mockDismissNotice = vi.fn();
const mockOpenWorkOrderDetail = vi.fn();
const mockCloseWorkOrderDetail = vi.fn();

let mockNotices: ActionableNotice[] = [];
let mockActiveModalWorkOrderId: number | null = null;

vi.mock("@/infrastructure/notifications/NotificationContext", () => ({
  useNotifications: () => ({
    notices: mockNotices,
    dismissNotice: mockDismissNotice,
    activeModalWorkOrderId: mockActiveModalWorkOrderId,
    openWorkOrderDetail: mockOpenWorkOrderDetail,
    closeWorkOrderDetail: mockCloseWorkOrderDetail,
  }),
}));

vi.mock("@/components/work-orders/WorkOrderDetailModal", () => {
  const MockModal = ({
    open,
    workOrderId,
    onClose,
  }: {
    open: boolean;
    workOrderId: number | null;
    onClose: () => void;
  }) => (
    open ? (
      <div data-testid="mock-work-order-modal">
        Order #{workOrderId}
        <button onClick={onClose}>Close modal</button>
      </div>
    ) : null
  );
  return {
    WorkOrderDetailModal: MockModal,
    default: MockModal,
  };
});

describe("NotificationToasts", () => {
  it("renders nothing when there are no notices and modal is closed", () => {
    mockNotices = [];
    mockActiveModalWorkOrderId = null;
    render(<NotificationToasts role="consumer" />);
    expect(screen.queryByTestId("notification-toasts-container")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mock-work-order-modal")).not.toBeInTheDocument();
  });

  it("renders toast notice with title, description, action and close button", async () => {
    const user = userEvent.setup();
    const mockAction = vi.fn();

    mockNotices = [
      {
        id: "notice-1",
        type: "work_order_close_to_scheduled_time",
        title: "Servicio próximo a iniciar",
        description: "Tu servicio está próximo.",
        actionLabel: "Ver orden",
        resourceType: "work_order",
        resourceId: 42,
        onAction: mockAction,
      },
    ];

    render(<NotificationToasts role="consumer" />);

    expect(screen.getByText("Servicio próximo a iniciar")).toBeInTheDocument();
    expect(screen.getByText("Tu servicio está próximo.")).toBeInTheDocument();

    const actionBtn = screen.getByRole("button", { name: "Ver orden" });
    await user.click(actionBtn);
    expect(mockAction).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByRole("button", { name: "Cerrar aviso" });
    await user.click(closeBtn);
    expect(mockDismissNotice).toHaveBeenCalledWith("notice-1");
  });

  it("renders WorkOrderDetailModal when activeModalWorkOrderId is set", async () => {
    const user = userEvent.setup();
    mockNotices = [];
    mockActiveModalWorkOrderId = 789;

    render(<NotificationToasts role="consumer" />);

    expect(screen.getByTestId("mock-work-order-modal")).toHaveTextContent("Order #789");

    const closeBtn = screen.getByRole("button", { name: "Close modal" });
    await user.click(closeBtn);
    expect(mockCloseWorkOrderDetail).toHaveBeenCalledTimes(1);
  });
});
