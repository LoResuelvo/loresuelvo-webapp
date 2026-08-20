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

    await waitFor(() => {
      expect(screen.getByTestId("work-order-detail-modal")).toBeInTheDocument();
      expect(screen.getByText("Programada")).toBeInTheDocument();
      expect(screen.getByText("Reparación de cañería en cocina")).toBeInTheDocument();
      expect(screen.getByText("$ 15.000,00")).toBeInTheDocument();
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
});
