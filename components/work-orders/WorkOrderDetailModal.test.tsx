import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { WorkOrderDetailModal } from "./WorkOrderDetailModal";
import {
  getWorkOrderDetailAction,
  createWorkOrderReviewAction,
} from "@/app/work-orders/actions";


vi.mock("@/app/work-orders/actions", () => ({
  getWorkOrderDetailAction: vi.fn(),
  createServiceBalanceCheckoutAction: vi.fn(),
  createWorkOrderReviewAction: vi.fn(),
}));


describe("WorkOrderDetailModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render contractual details and status badge", async () => {
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
        estimatedDurationMinutes: 120,
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
        initialEstimatedDurationMinutes={120}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("work-order-detail-modal")).toBeInTheDocument();
      expect(screen.getByText("Programada")).toBeInTheDocument();
      expect(screen.getByText("Reparación de cañería en cocina")).toBeInTheDocument();
      expect(screen.getByText("$ 15.000,00")).toBeInTheDocument();
      expect(screen.getByText("2 h")).toBeInTheDocument();
    });
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

  it("should render completion evidence section when completionReport is present", async () => {
    vi.mocked(getWorkOrderDetailAction).mockResolvedValue({
      ok: true,
      detail: {
        id: 10,
        serviceProposalId: 42,
        consumerId: 10,
        providerId: 1,
        status: "awaiting_payment",
        amountCents: 1500000,
        scheduledOn: "2026-08-20T10:00:00Z",
        description: "Reparación de cañería en cocina",
        acceptedOn: "2026-08-05T10:00:00Z",
        completionReport: {
          id: 1,
          description: "Trabajo finalizado correctamente y verificado.",
          reportedOn: "2026-08-20T12:00:00Z",
          images: [
            {
              fileId: "file-01",
              originalName: "evidencia_1.jpg",
              url: "https://placehold.co/600x400/png?text=Evidencia+1",
            },
          ],
        },
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
      expect(screen.getByTestId("completion-evidence-section")).toBeInTheDocument();
      expect(screen.getByText("Evidencia de finalización")).toBeInTheDocument();
      expect(
        screen.getByText("Trabajo finalizado correctamente y verificado.")
      ).toBeInTheDocument();
      expect(screen.getByText("Pendiente de pago")).toBeInTheDocument();
    });
  });

  it("should render paid status badge and payment date when order is paid", async () => {
    vi.mocked(getWorkOrderDetailAction).mockResolvedValue({
      ok: true,
      detail: {
        id: 10,
        serviceProposalId: 42,
        consumerId: 10,
        providerId: 1,
        status: "paid",
        amountCents: 1500000,
        scheduledOn: "2026-08-20T10:00:00Z",
        description: "Reparación de cañería en cocina",
        acceptedOn: "2026-08-05T10:00:00Z",
        paidOn: "2026-08-21T14:30:00Z",
        completionReport: {
          id: 1,
          description: "Trabajo terminado",
          reportedOn: "2026-08-20T12:00:00Z",
          images: [],
        },
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
      expect(screen.getByText("Pagada")).toBeInTheDocument();
      expect(screen.getByTestId("work-order-paid-info")).toBeInTheDocument();
      expect(screen.getByText("Fecha de pago")).toBeInTheDocument();
    });
  });

  it("should render loading indicator while fetching detail", () => {
    vi.mocked(getWorkOrderDetailAction).mockReturnValue(new Promise(() => {}));

    render(
      <WorkOrderDetailModal
        open={true}
        onClose={vi.fn()}
        workOrderId={10}
      />
    );

    expect(screen.getByTestId("work-order-detail-loading")).toBeInTheDocument();
    expect(screen.getByText("Cargando detalle...")).toBeInTheDocument();
  });

  it("should render error message when fetching detail fails", async () => {
    vi.mocked(getWorkOrderDetailAction).mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(
      <WorkOrderDetailModal
        open={true}
        onClose={vi.fn()}
        workOrderId={10}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("work-order-detail-error")).toBeInTheDocument();
      expect(
        screen.getByText(
          "No se pudo cargar el detalle de la orden. Por favor intenta nuevamente."
        )
      ).toBeInTheDocument();
    });
  });

  it("should render review and rating section when review is present", async () => {
    vi.mocked(getWorkOrderDetailAction).mockResolvedValue({
      ok: true,
      detail: {
        id: 10,
        serviceProposalId: 42,
        consumerId: 10,
        providerId: 1,
        status: "paid",
        amountCents: 1500000,
        scheduledOn: "2026-08-20T10:00:00Z",
        description: "Reparación de cañería en cocina",
        acceptedOn: "2026-08-05T10:00:00Z",
        paidOn: "2026-08-21T14:30:00Z",
        review: {
          rating: 5,
          comment: "Excelente trabajo realizado.",
          createdOn: "2026-08-21T15:00:00Z",
        },
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
      expect(screen.getByTestId("work-order-review-section")).toBeInTheDocument();
      expect(screen.getByText("Calificación del servicio")).toBeInTheDocument();
      expect(screen.getByText("“Excelente trabajo realizado.”")).toBeInTheDocument();
      expect(screen.getAllByTestId("star-filled")).toHaveLength(5);
    });
  });

  it("should show 'Calificar servicio' button when order is paid, user is consumer and no review exists", async () => {
    vi.mocked(getWorkOrderDetailAction).mockResolvedValue({
      ok: true,
      detail: {
        id: 10,
        serviceProposalId: 42,
        consumerId: 10,
        providerId: 1,
        status: "paid",
        amountCents: 1500000,
        scheduledOn: "2026-08-20T10:00:00Z",
        description: "Reparación de cañería",
        acceptedOn: "2026-08-05T10:00:00Z",
        paidOn: "2026-08-21T14:30:00Z",
      },
    });

    render(
      <WorkOrderDetailModal
        open={true}
        onClose={vi.fn()}
        workOrderId={10}
        isConsumer={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("open-review-button")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Calificar servicio" })).toBeInTheDocument();
    });
  });

  it("should not show 'Calificar servicio' button when user is provider", async () => {
    vi.mocked(getWorkOrderDetailAction).mockResolvedValue({
      ok: true,
      detail: {
        id: 10,
        serviceProposalId: 42,
        consumerId: 10,
        providerId: 1,
        status: "paid",
        amountCents: 1500000,
        scheduledOn: "2026-08-20T10:00:00Z",
        description: "Reparación de cañería",
        acceptedOn: "2026-08-05T10:00:00Z",
        paidOn: "2026-08-21T14:30:00Z",
      },
    });

    render(
      <WorkOrderDetailModal
        open={true}
        onClose={vi.fn()}
        workOrderId={10}
        isConsumer={false}
      />
    );

    await waitFor(() => {
      expect(screen.queryByTestId("open-review-button")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Calificar servicio" })).not.toBeInTheDocument();
    });
  });

  it("should open review modal when clicking 'Calificar servicio' and update detail on success", async () => {
    const user = userEvent.setup();
    vi.mocked(getWorkOrderDetailAction).mockResolvedValue({
      ok: true,
      detail: {
        id: 10,
        serviceProposalId: 42,
        consumerId: 10,
        providerId: 1,
        status: "paid",
        amountCents: 1500000,
        scheduledOn: "2026-08-20T10:00:00Z",
        description: "Reparación de cañería",
        acceptedOn: "2026-08-05T10:00:00Z",
        paidOn: "2026-08-21T14:30:00Z",
      },
    });

    vi.mocked(createWorkOrderReviewAction).mockResolvedValue({
      ok: true,
      review: {
        rating: 5,
        comment: "Excelente servicio",
        createdOn: "2026-08-21T15:00:00Z",
      },
    });

    render(
      <WorkOrderDetailModal
        open={true}
        onClose={vi.fn()}
        workOrderId={10}
        isConsumer={true}
      />
    );

    const rateBtn = await screen.findByTestId("open-review-button");
    await user.click(rateBtn);

    expect(screen.getByTestId("review-work-order-modal")).toBeInTheDocument();

    const star5 = screen.getByRole("radio", { name: "5 estrellas" });
    await user.click(star5);

    const commentInput = screen.getByTestId("review-comment-input");
    await user.type(commentInput, "Excelente servicio");

    const submitBtn = screen.getByTestId("submit-review-button");
    await user.click(submitBtn);

    expect(createWorkOrderReviewAction).toHaveBeenCalledWith(10, {
      rating: 5,
      comment: "Excelente servicio",
    });

    const successBox = await screen.findByTestId("review-success-message");
    const closeSuccessBtn = within(successBox).getByRole("button", { name: "Cerrar" });
    await user.click(closeSuccessBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("open-review-button")).not.toBeInTheDocument();
      expect(screen.getByTestId("work-order-review-section")).toBeInTheDocument();
      expect(screen.getByText("“Excelente servicio”")).toBeInTheDocument();
    });
  });
});


