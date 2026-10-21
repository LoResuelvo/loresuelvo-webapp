import { render, screen, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { WorkOrderDetailModal } from "./WorkOrderDetailModal";
import { ROUTES } from "@/lib/routes";
import * as NotificationContextModule from "@/infrastructure/notifications/NotificationContext";
import type { ResourceListener } from "@/infrastructure/notifications/NotificationContext";
import {
  getWorkOrderDetailAction,
  createWorkOrderReviewAction,
  reportWorkOrderReviewAction,
} from "@/app/work-orders/actions";


vi.mock("@/app/work-orders/actions", () => ({
  getWorkOrderDetailAction: vi.fn(),
  createServiceBalanceCheckoutAction: vi.fn(),
  createWorkOrderReviewAction: vi.fn(),
  reportWorkOrderReviewAction: vi.fn(),
}));


describe("WorkOrderDetailModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    { isConsumer: true, profileHref: ROUTES.consumer.profile },
    { isConsumer: false, profileHref: ROUTES.provider.profile },
  ])("links a disconnected participant to their own profile ($isConsumer)", ({ isConsumer, profileHref }) => {
    vi.mocked(getWorkOrderDetailAction).mockReturnValue(new Promise(() => {}));
    render(<WorkOrderDetailModal
      open onClose={vi.fn()} workOrderId={10} isConsumer={isConsumer}
      calendarConnection={{ state: "ready", status: "disconnected" }}
    />);

    expect(screen.getByRole("link", { name: "Mi perfil" })).toHaveAttribute("href", profileHref);
    expect(screen.queryByText("Google Calendar vinculado")).not.toBeInTheDocument();
    expect(screen.getByTestId("work-order-detail-loading")).toBeInTheDocument();
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
        calendarConnection={{ state: "ready", status: "connected" }}
      />
    );

    expect(screen.getByTestId("work-order-detail-loading")).toBeInTheDocument();
    expect(screen.getByText("Cargando detalle...")).toBeInTheDocument();
    expect(screen.getByText("Google Calendar vinculado")).toBeInTheDocument();
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

  it("lets a provider report a visible review and hides the report action after success", async () => {
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
        description: "Reparación de cañería en cocina",
        acceptedOn: "2026-08-05T10:00:00Z",
        review: {
          rating: 4,
          comment: "La reseña original se conserva.",
          description: "La reseña original se conserva.",
        },
      },
    });
    vi.mocked(reportWorkOrderReviewAction).mockResolvedValue({
      ok: true,
      receipt: { id: 71, status: "pending" },
    });

    render(
      <WorkOrderDetailModal
        open={true}
        onClose={vi.fn()}
        workOrderId={10}
        isConsumer={false}
      />
    );

    await user.click(await screen.findByRole("button", { name: "Reportar reseña" }));
    const modal = screen.getByTestId("report-review-modal");
    await user.selectOptions(within(modal).getByRole("combobox", { name: "Motivo" }), "personal_data");
    await user.type(
      within(modal).getByRole("textbox", { name: "Explicación (opcional)" }),
      "Publica mi teléfono sin autorización."
    );
    await user.click(within(modal).getByRole("button", { name: "Enviar reporte" }));

    expect(reportWorkOrderReviewAction).toHaveBeenCalledWith(10, {
      category: "personal_data",
      explanation: "Publica mi teléfono sin autorización.",
    });
    expect(await within(modal).findByRole("status")).toHaveTextContent(
      "Reporte recibido para revisión."
    );
    await user.click(within(modal).getByRole("button", { name: "Cerrar" }));

    expect(screen.queryByRole("button", { name: "Reportar reseña" })).not.toBeInTheDocument();
    expect(screen.getByTestId("work-order-review-section")).toBeInTheDocument();
    expect(screen.getByText("“La reseña original se conserva.”")).toBeInTheDocument();
    expect(screen.getAllByTestId("star-filled")).toHaveLength(4);
    await waitFor(() => {
      expect(screen.getByTestId("work-order-review-section")).toHaveFocus();
    });
  });

  it("hides the report action after the server says the review was already reported", async () => {
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
        description: "Reparación de cañería en cocina",
        acceptedOn: "2026-08-05T10:00:00Z",
        review: { rating: 4, comment: "La reseña original se conserva." },
      },
    });
    vi.mocked(reportWorkOrderReviewAction).mockResolvedValue({ ok: false, status: 409 });

    render(
      <WorkOrderDetailModal
        open
        onClose={vi.fn()}
        workOrderId={10}
        isConsumer={false}
      />
    );

    await user.click(await screen.findByRole("button", { name: "Reportar reseña" }));
    const reportModal = screen.getByTestId("report-review-modal");
    await user.selectOptions(
      within(reportModal).getByRole("combobox", { name: "Motivo" }),
      "spam_advertising"
    );
    await user.click(within(reportModal).getByRole("button", { name: "Enviar reporte" }));

    expect(await within(reportModal).findByRole("alert")).toHaveTextContent(
      "La reseña ya fue reportada y no se puede enviar otro reporte."
    );
    expect(within(reportModal).queryByTestId("report-review-success-message")).not.toBeInTheDocument();
    await user.click(
      within(screen.getByRole("dialog", { name: "Reportar reseña" })).getByRole("button", {
        name: "Cerrar",
      })
    );

    expect(screen.queryByRole("button", { name: "Reportar reseña" })).not.toBeInTheDocument();
    expect(screen.getByText("“La reseña original se conserva.”")).toBeInTheDocument();
    expect(screen.getAllByTestId("star-filled")).toHaveLength(4);
  });

  it("does not apply a report response to a different order", async () => {
    const user = userEvent.setup();
    let resolveReport: ((result: { ok: true; receipt: { id: number; status: "pending" } }) => void) | undefined;
    const pendingReport = new Promise<{ ok: true; receipt: { id: number; status: "pending" } }>(
      (resolve) => {
        resolveReport = resolve;
      }
    );
    vi.mocked(getWorkOrderDetailAction).mockImplementation(async (id) => ({
      ok: true,
      detail: {
        id,
        serviceProposalId: 42,
        consumerId: 10,
        providerId: 1,
        status: "paid",
        amountCents: 1500000,
        scheduledOn: "2026-08-20T10:00:00Z",
        description: "Reparación de cañería en cocina",
        acceptedOn: "2026-08-05T10:00:00Z",
        review: { rating: 4, comment: "Reseña visible" },
      },
    }));
    vi.mocked(reportWorkOrderReviewAction).mockReturnValue(pendingReport);

    const onClose = vi.fn();
    const { rerender } = render(
      <WorkOrderDetailModal open onClose={onClose} workOrderId={10} isConsumer={false} />
    );

    await user.click(await screen.findByRole("button", { name: "Reportar reseña" }));
    const modal = screen.getByTestId("report-review-modal");
    await user.selectOptions(within(modal).getByRole("combobox", { name: "Motivo" }), "spam_advertising");
    await user.click(within(modal).getByRole("button", { name: "Enviar reporte" }));

    rerender(
      <WorkOrderDetailModal open onClose={onClose} workOrderId={11} isConsumer={false} />
    );
    await screen.findByText("#11");
    expect(await screen.findByRole("button", { name: "Reportar reseña" })).toBeInTheDocument();

    resolveReport?.({ ok: true, receipt: { id: 71, status: "pending" } });
    expect(await screen.findByRole("button", { name: "Reportar reseña" })).toBeInTheDocument();
  });

  it("returns focus to the detail region when the active order has no review", async () => {
    const user = userEvent.setup();
    vi.mocked(getWorkOrderDetailAction).mockImplementation(async (id) => ({
      ok: true,
      detail: {
        id,
        serviceProposalId: 42,
        consumerId: 10,
        providerId: 1,
        status: "paid",
        amountCents: 1500000,
        scheduledOn: "2026-08-20T10:00:00Z",
        description: "Reparación de cañería en cocina",
        acceptedOn: "2026-08-05T10:00:00Z",
        ...(id === 10 ? { review: { rating: 4, comment: "Reseña visible" } } : {}),
      },
    }));

    const onClose = vi.fn();
    const { rerender } = render(
      <WorkOrderDetailModal open onClose={onClose} workOrderId={10} isConsumer={false} />
    );

    await user.click(await screen.findByRole("button", { name: "Reportar reseña" }));
    rerender(
      <WorkOrderDetailModal open onClose={onClose} workOrderId={11} isConsumer={false} />
    );

    await screen.findByText("#11");
    await waitFor(() => {
      expect(screen.queryByTestId("report-review-modal")).not.toBeInTheDocument();
      expect(screen.getByTestId("work-order-detail-modal")).toHaveFocus();
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

  it("updates order detail when work_order realtime notification arrives", async () => {
    let capturedCallback: ResourceListener | undefined;
    vi.spyOn(NotificationContextModule, "useResourceUpdate").mockImplementation(
      (_type, _id, cb: ResourceListener) => {
        capturedCallback = cb;
      }
    );

    const initialOrder = {
      id: 15,
      serviceProposalId: 10,
      consumerId: 2,
      providerId: 5,
      status: "scheduled" as const,
      amountCents: 100000,
      scheduledOn: "2026-08-20T10:00:00Z",
      description: "Reparación pendiente",
      acceptedOn: "2026-08-19T10:00:00Z",
    };

    const completedOrder = {
      ...initialOrder,
      status: "awaiting_payment" as const,
      completionReport: {
        id: 1,
        description: "Trabajo terminado con éxito",
        reportedOn: "2026-08-20T12:00:00Z",
        images: [],
      },
    };

    vi.mocked(getWorkOrderDetailAction)
      .mockResolvedValueOnce({ ok: true, detail: initialOrder })
      .mockResolvedValueOnce({ ok: true, detail: completedOrder });

    render(<WorkOrderDetailModal open={true} workOrderId={15} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("#15")).toBeInTheDocument();
      expect(screen.getByText("Programada")).toBeInTheDocument();
    });

    await act(async () => {
      await capturedCallback?.({
        id: 200,
        userId: 1,
        type: "work_order_completion_reported",
        resourceType: "work_order",
        resourceId: 15,
        createdAt: "2026-07-06T10:00:00-03:00",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Pendiente de pago")).toBeInTheDocument();
    });
  });

  it("keeps the latest order refresh when responses arrive out of order", async () => {
    let capturedCallback: ResourceListener | undefined;
    vi.spyOn(NotificationContextModule, "useResourceUpdate").mockImplementation(
      (_type, _id, cb: ResourceListener) => {
        capturedCallback = cb;
      }
    );

    const initialOrder = {
      id: 15,
      serviceProposalId: 10,
      consumerId: 2,
      providerId: 5,
      status: "scheduled" as const,
      amountCents: 100000,
      scheduledOn: "2026-08-20T10:00:00Z",
      description: "Reparación pendiente",
      acceptedOn: "2026-08-19T10:00:00Z",
    };
    const olderOrder = { ...initialOrder, description: "Respuesta anterior" };
    const latestOrder = { ...initialOrder, description: "Respuesta más reciente" };

    let resolveOlder!: (result: Awaited<ReturnType<typeof getWorkOrderDetailAction>>) => void;
    let resolveLatest!: (result: Awaited<ReturnType<typeof getWorkOrderDetailAction>>) => void;
    const olderRefresh = new Promise<Awaited<ReturnType<typeof getWorkOrderDetailAction>>>((resolve) => {
      resolveOlder = resolve;
    });
    const latestRefresh = new Promise<Awaited<ReturnType<typeof getWorkOrderDetailAction>>>((resolve) => {
      resolveLatest = resolve;
    });

    vi.mocked(getWorkOrderDetailAction)
      .mockResolvedValueOnce({ ok: true, detail: initialOrder })
      .mockReturnValueOnce(olderRefresh)
      .mockReturnValueOnce(latestRefresh);

    render(<WorkOrderDetailModal open={true} workOrderId={15} onClose={() => {}} />);
    expect(await screen.findByText("Reparación pendiente")).toBeInTheDocument();

    act(() => {
      capturedCallback?.({
        id: 210,
        userId: 1,
        type: "work_order_completion_reported",
        resourceType: "work_order",
        resourceId: 15,
        createdAt: "2026-07-06T10:00:00-03:00",
      });
      capturedCallback?.({
        id: 211,
        userId: 1,
        type: "work_order_final_payment_approved",
        resourceType: "work_order",
        resourceId: 15,
        createdAt: "2026-07-06T10:00:00-03:00",
      });
    });
    await waitFor(() => expect(getWorkOrderDetailAction).toHaveBeenCalledTimes(3));

    await act(async () => {
      resolveLatest({ ok: true, detail: latestOrder });
      await latestRefresh;
    });
    expect(await screen.findByText("Respuesta más reciente")).toBeInTheDocument();

    await act(async () => {
      resolveOlder({ ok: true, detail: olderOrder });
      await olderRefresh;
    });

    expect(screen.getByText("Respuesta más reciente")).toBeInTheDocument();
    expect(screen.queryByText("Respuesta anterior")).not.toBeInTheDocument();
  });

  it("preserves visible order details and displays recovery retry when background refresh fails", async () => {
    let capturedCallback: ResourceListener | undefined;
    vi.spyOn(NotificationContextModule, "useResourceUpdate").mockImplementation(
      (_type, _id, cb: ResourceListener) => {
        capturedCallback = cb;
      }
    );

    const initialOrder = {
      id: 15,
      serviceProposalId: 10,
      consumerId: 2,
      providerId: 5,
      status: "scheduled" as const,
      amountCents: 100000,
      scheduledOn: "2026-08-20T10:00:00Z",
      description: "Reparación pendiente",
      acceptedOn: "2026-08-19T10:00:00Z",
    };

    const refreshedOrder = { ...initialOrder, status: "awaiting_payment" as const };
    vi.mocked(getWorkOrderDetailAction)
      .mockResolvedValueOnce({ ok: true, detail: initialOrder })
      .mockRejectedValueOnce(new Error("Network disconnect"))
      .mockResolvedValueOnce({ ok: true, detail: refreshedOrder });

    render(<WorkOrderDetailModal open={true} workOrderId={15} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("#15")).toBeInTheDocument();
      expect(screen.getByText("Programada")).toBeInTheDocument();
    });

    await act(async () => {
      await capturedCallback?.({
        id: 201,
        userId: 1,
        type: "work_order_completion_reported",
        resourceType: "work_order",
        resourceId: 15,
        createdAt: "2026-07-06T10:00:00-03:00",
      });
    });

    // Detail is still visible!
    expect(screen.getByText("#15")).toBeInTheDocument();
    expect(screen.getByText("Programada")).toBeInTheDocument();
    // Recovery banner is shown
    expect(screen.getByTestId("work-order-refresh-error")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Pendiente de pago")).toBeInTheDocument();
    expect(screen.queryByTestId("work-order-refresh-error")).not.toBeInTheDocument();
    expect(screen.getByText("Reparación pendiente")).toBeInTheDocument();
  });
});
