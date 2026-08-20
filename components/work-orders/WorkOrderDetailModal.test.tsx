import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WorkOrderDetailModal } from "./WorkOrderDetailModal";

describe("WorkOrderDetailModal", () => {
  it("should render contractual details and status badge", () => {
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

  it("should call onClose when clicking close button", async () => {
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
