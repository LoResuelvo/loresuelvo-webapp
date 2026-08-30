import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WorkOrderActionsSection } from "./WorkOrderActionsSection";

vi.mock("@/app/work-orders/actions", () => ({
  createServiceBalanceCheckoutAction: vi.fn(),
}));

describe("WorkOrderActionsSection", () => {
  it("renders payment component when status is awaiting_payment", () => {
    render(
      <WorkOrderActionsSection
        workOrderId={10}
        status="awaiting_payment"
        amountCents={1500000}
        canRate={false}
        onOpenReview={vi.fn()}
      />
    );

    expect(screen.getByText("Pago del saldo del servicio")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pagar saldo del servicio" })
    ).toBeInTheDocument();
  });

  it("renders review button when canRate is true and calls onOpenReview on click", async () => {
    const user = userEvent.setup();
    const handleOpenReview = vi.fn();

    render(
      <WorkOrderActionsSection
        workOrderId={10}
        status="paid"
        amountCents={1500000}
        canRate={true}
        onOpenReview={handleOpenReview}
      />
    );

    const button = screen.getByTestId("open-review-button");
    expect(button).toBeInTheDocument();
    await user.click(button);

    expect(handleOpenReview).toHaveBeenCalledTimes(1);
  });
});
