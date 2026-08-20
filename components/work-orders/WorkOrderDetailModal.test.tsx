import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { WorkOrderDetailModal } from "./WorkOrderDetailModal";
import { getWorkOrderDetailAction } from "@/app/work-orders/actions";

vi.mock("@/app/work-orders/actions", () => ({
  getWorkOrderDetailAction: vi.fn(),
}));

describe("WorkOrderDetailModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render contractual details and status badge", () => {
    vi.mocked(getWorkOrderDetailAction).mockResolvedValue({
      ok: true,
      detail: {
        id: 10,
        serviceProposalId: 42,
        consumerId: 10,
        providerId: 1,
        status: "scheduled",
        amountCents: 1500000,
        scheduledOn: "2026-08-20T10:00:00Z",
        description: "Reparación de cañería en cocina",
        acceptedOn: "2026-08-05T10:00:00Z",
      },
    });

    render(
      <WorkOrderDetailModal
        open={true}
        onClose={vi.fn()}
        workOrderId={10}
        initialAmountCents={1500000}
        initialScheduledOn="2026-08-20T10:00:00Z"
        initialDescription="Reparación de cañería en cocina"
      />
    );

    expect(screen.getByTestId("work-order-detail-modal")).toBeInTheDocument();
    expect(screen.getByText("Programada")).toBeInTheDocument();
    expect(screen.getByText("Reparación de cañería en cocina")).toBeInTheDocument();
    expect(screen.getByText("$ 15.000,00")).toBeInTheDocument();
  });

  it("should fetch and update detail when opened with workOrderId", async () => {
    vi.mocked(getWorkOrderDetailAction).mockResolvedValue({
      ok: true,
      detail: {
        id: 10,
        serviceProposalId: 42,
        consumerId: 10,
        providerId: 1,
        status: "scheduled",
        amountCents: 2000000,
        scheduledOn: "2026-08-25T10:00:00Z",
        description: "Instalación de grifería completa",
        acceptedOn: "2026-08-05T10:00:00Z",
      },
    });

    render(
      <WorkOrderDetailModal
        open={true}
        onClose={vi.fn()}
        workOrderId={10}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Instalación de grifería completa")).toBeInTheDocument();
      expect(screen.getByText("$ 20.000,00")).toBeInTheDocument();
    });
  });

  it("should call onClose when clicking close button", async () => {
    vi.mocked(getWorkOrderDetailAction).mockResolvedValue({
      ok: true,
      detail: {
        id: 10,
        serviceProposalId: 42,
        consumerId: 10,
        providerId: 1,
        status: "scheduled",
        amountCents: 1500000,
        scheduledOn: "2026-08-20T10:00:00Z",
        description: "Reparación de cañería en cocina",
        acceptedOn: "2026-08-05T10:00:00Z",
      },
    });

    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <WorkOrderDetailModal
        open={true}
        onClose={handleClose}
        workOrderId={10}
      />
    );

    const closeBtn = screen.getByRole("button", { name: "Cerrar" });
    await user.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
