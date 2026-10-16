import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, APP_URL, visibleTimeout } from "../support/world";
import { ROUTES } from "../../lib/routes";
import {
  aProposal,
  aWorkOrder,
  aCompletionReport,
  aWsTicket,
} from "../support/factories";
import { t } from "../../infrastructure/i18n/translations";

async function interceptWebSocket(world: CustomWorld) {
  world.wsServer = null;
  (global as any).wsServer = null;
  await world.page.routeWebSocket(/.*\/ws.*/, (ws) => {
    world.wsServer = ws;
    (global as any).wsServer = ws;
    ws.onMessage(() => {});
  });
}

async function sendWsEvent(world: CustomWorld, event: any) {
  let attempts = 0;
  while (!world.wsServer && attempts < 100) {
    await new Promise((r) => setTimeout(r, 200));
    attempts++;
  }
  if (!world.wsServer) {
    throw new Error("No hay WebSocket interceptado.");
  }
  world.wsServer.send(JSON.stringify(event));
}

async function openWorkOrderModalDirectly(
  world: CustomWorld,
  proposalId: number,
  targetUrl: string
) {
  await world.page.goto(targetUrl, { waitUntil: "domcontentloaded" });

  const tabAceptadas = world.page.getByRole("tab", { name: /aceptadas/i });
  await tabAceptadas.waitFor({ state: "visible", timeout: 10000 });

  for (let i = 0; i < 10; i++) {
    await tabAceptadas.click();
    await world.page.waitForTimeout(200);
    const isSelected = await tabAceptadas.getAttribute("aria-selected");
    if (isSelected === "true") break;
  }

  const card = world.page
    .getByTestId("proposal-card")
    .or(world.page.getByRole("listitem"))
    .first();
  await card.waitFor({ state: "visible", timeout: 10000 });

  const detailModal = world.page.getByTestId("service-proposal-detail-modal");
  for (let i = 0; i < 5; i++) {
    await card.click();
    const isModalVisible = await detailModal.isVisible().catch(() => false);
    if (isModalVisible) break;
    await world.page.waitForTimeout(300);
  }
  await detailModal.waitFor({ state: "visible", timeout: 10000 });

  const viewDetailButton = world.page.getByRole("button", {
    name: /ver detalle de la orden/i,
  });
  await viewDetailButton.waitFor({ state: "visible", timeout: 10000 });
  await viewDetailButton.click();

  const workOrderModal = world.page.getByTestId("work-order-detail-modal");
  await workOrderModal.waitFor({ state: "visible", timeout: 10000 });
}

Given(
  "que el sistema de mensajería en tiempo real está activo",
  async function (this: CustomWorld) {
    await this.stubPost("/ws-tickets", 201, aWsTicket("mock-ws-ticket-notif"));
    await interceptWebSocket(this);
  }
);

// --- Scenario 1: Solicitud de trabajo en vivo ---

Given(
  "que estoy autenticado como prestador en el inicio de prestador",
  async function (this: CustomWorld) {
    await this.setSession("provider");
    await this.stubGet("/job-requests", []);
    await this.stubGet("/service-proposals", []);
    await this.stubGet("/provider/dashboard", {
      work_requests: [],
      scheduled_jobs: [],
      metrics: { income_label: "$0", jobs_completed_count: 0, rating_label: "0.0" },
    });

    await this.page.goto(`${APP_URL}${ROUTES.provider.home}`, {
      waitUntil: "domcontentloaded",
    });
    await this.page
      .getByRole("heading", { name: t.providerHome.workRequestsSection.title })
      .waitFor({ state: "visible", timeout: 10000 });
  }
);

When(
  "recibo una notificación de nueva solicitud de trabajo para {string}",
  async function (this: CustomWorld, title: string) {
    await sendWsEvent(this, {
      type: "notification.created",
      notification: {
        id: 101,
        user_id: 1,
        type: "job_request_received",
        resource_type: "job_request",
        resource_id: 101,
        created_at: new Date().toISOString(),
      },
      job_request: {
        id: 101,
        conversation_id: 201,
        title,
        description: "Detalle de la solicitud de prueba",
        status: "pending",
        requester: { name: "Carlos", surname: "Gómez" },
        images: [],
      },
    });
  }
);

Then(
  "veo la solicitud {string} en la lista de solicitudes pendientes sin recargar la página",
  async function (this: CustomWorld, title: string) {
    const el = this.page.getByText(title);
    await el.waitFor(visibleTimeout);
    assert.ok(await el.isVisible());
  }
);

// --- Scenario 2: Propuesta de servicio recibida ---

Given(
  "que estoy autenticado como consumidor en mis servicios",
  async function (this: CustomWorld) {
    await this.setSession("consumer");
    await this.stubGet("/service-proposals", []);

    await this.page.goto(`${APP_URL}${ROUTES.consumer.services}`, {
      waitUntil: "domcontentloaded",
    });
    await this.page
      .getByRole("heading", { name: t.serviceProposals.sectionTitle })
      .waitFor({ state: "visible", timeout: 10000 });
  }
);

When(
  "recibo una notificación de nueva propuesta de servicio para {string}",
  async function (this: CustomWorld, description: string) {
    const newProposal = aProposal("consumer", {
      id: 501,
      description,
      status: "pending",
      counterpart: { id: 2, role: "provider", name: "Esteban", surname: "Plomero" },
    });
    await this.stubGet("/service-proposals", [newProposal]);

    await sendWsEvent(this, {
      type: "notification.created",
      notification: {
        id: 501,
        user_id: 1,
        type: "service_proposal_received",
        resource_type: "service_proposal",
        resource_id: 501,
        created_at: new Date().toISOString(),
      },
    });
  }
);

Then(
  "veo la propuesta de servicio {string} en la lista de pendientes sin recargar la página",
  async function (this: CustomWorld, description: string) {
    const el = this.page.getByText(description);
    await el.waitFor(visibleTimeout);
    assert.ok(await el.isVisible());
  }
);

// --- Scenario 3: Propuesta aceptada ---

Given(
  "que estoy autenticado como prestador en mis trabajos con una propuesta pendiente",
  async function (this: CustomWorld) {
    await this.setSession("provider");
    const proposal = aProposal("provider", {
      id: 601,
      description: "Instalación de luces LED",
      status: "pending",
      counterpart: { id: 3, role: "consumer", name: "Laura", surname: "Mendoza" },
    });
    await this.stubGet("/service-proposals", [proposal]);

    await this.page.goto(`${APP_URL}${ROUTES.provider.jobs}`, {
      waitUntil: "domcontentloaded",
    });
    const item = this.page.getByText("Instalación de luces LED");
    await item.waitFor(visibleTimeout);
    assert.ok(await item.isVisible());
  }
);

When(
  "recibo una notificación de propuesta aceptada",
  async function (this: CustomWorld) {
    const acceptedProposal = aProposal("provider", {
      id: 601,
      description: "Instalación de luces LED",
      status: "accepted",
      counterpart: { id: 3, role: "consumer", name: "Laura", surname: "Mendoza" },
    });
    await this.stubGet("/service-proposals", [acceptedProposal]);

    await sendWsEvent(this, {
      type: "notification.created",
      notification: {
        id: 601,
        user_id: 1,
        type: "service_proposal_accepted",
        resource_type: "service_proposal",
        resource_id: 601,
        created_at: new Date().toISOString(),
      },
    });
  }
);

Then(
  "veo la propuesta reflejada en los trabajos aceptados sin recargar la página",
  async function (this: CustomWorld) {
    const tabAceptadas = this.page.getByRole("tab", { name: /aceptadas/i });
    await tabAceptadas.click();
    const item = this.page.getByText("Instalación de luces LED");
    await item.waitFor(visibleTimeout);
    assert.ok(await item.isVisible());
  }
);

// --- Scenario 4: Finalización informada ---

Given(
  "que estoy autenticado como consumidor con el detalle de una orden de trabajo abierta",
  async function (this: CustomWorld) {
    await this.setSession("consumer");
    const proposal = aProposal("consumer", {
      id: 701,
      status: "accepted",
      description: "Reparación de cañerías",
    });
    const wo = aWorkOrder({
      id: 701,
      service_proposal_id: 701,
      status: "scheduled",
      description: "Reparación de cañerías",
    });

    await this.stubGet("/service-proposals", [proposal]);
    await this.stubGet("/work-orders?service_proposal_id=701", wo);
    await this.stubGet("/work-orders/701", wo);

    await openWorkOrderModalDirectly(
      this,
      701,
      `${APP_URL}${ROUTES.consumer.services}`
    );
    const scheduledLabel = this.page.getByText(t.workOrderDetail.statusScheduled);
    await scheduledLabel.waitFor(visibleTimeout);
    assert.ok(await scheduledLabel.isVisible());
  }
);

When(
  "recibo una notificación de finalización de la orden de trabajo",
  async function (this: CustomWorld) {
    const woCompleted = aWorkOrder({
      id: 701,
      service_proposal_id: 701,
      status: "awaiting_payment",
      description: "Reparación de cañerías",
      completion_report: aCompletionReport(),
    });
    await this.stubGet("/work-orders/701", woCompleted);

    await sendWsEvent(this, {
      type: "notification.created",
      notification: {
        id: 701,
        user_id: 1,
        type: "work_order_completion_reported",
        resource_type: "work_order",
        resource_id: 701,
        created_at: new Date().toISOString(),
      },
    });
  }
);

Then(
  "veo el estado de la orden actualizado a completada sin recargar la página",
  async function (this: CustomWorld) {
    const awaitingPaymentLabel = this.page.getByText(
      t.workOrderDetail.statusAwaitingPayment
    );
    await awaitingPaymentLabel.waitFor(visibleTimeout);
    assert.ok(await awaitingPaymentLabel.isVisible());
  }
);

// --- Scenario 5: Pago final aprobado ---

Given(
  "que estoy autenticado como prestador con el detalle de una orden de trabajo abierta",
  async function (this: CustomWorld) {
    await this.setSession("provider");
    const proposal = aProposal("provider", {
      id: 801,
      status: "accepted",
      description: "Reparación eléctrica",
    });
    const wo = aWorkOrder({
      id: 801,
      service_proposal_id: 801,
      status: "awaiting_payment",
      description: "Reparación eléctrica",
      completion_report: aCompletionReport(),
    });

    await this.stubGet("/service-proposals", [proposal]);
    await this.stubGet("/work-orders?service_proposal_id=801", wo);
    await this.stubGet("/work-orders/801", wo);

    await openWorkOrderModalDirectly(
      this,
      801,
      `${APP_URL}${ROUTES.provider.jobs}`
    );
    const awaitingPaymentLabel = this.page.getByText(
      t.workOrderDetail.statusAwaitingPayment
    );
    await awaitingPaymentLabel.waitFor(visibleTimeout);
    assert.ok(await awaitingPaymentLabel.isVisible());
  }
);

When(
  "recibo una notificación de pago final aprobado para esa orden",
  async function (this: CustomWorld) {
    const woPaid = aWorkOrder({
      id: 801,
      service_proposal_id: 801,
      status: "paid",
      description: "Reparación eléctrica",
      paid_on: new Date().toISOString(),
      completion_report: aCompletionReport(),
    });
    await this.stubGet("/work-orders/801", woPaid);

    await sendWsEvent(this, {
      type: "notification.created",
      notification: {
        id: 801,
        user_id: 1,
        type: "work_order_final_payment_approved",
        resource_type: "work_order",
        resource_id: 801,
        created_at: new Date().toISOString(),
      },
    });
  }
);

Then(
  "veo el estado de la orden actualizado a pagada sin recargar la página",
  async function (this: CustomWorld) {
    const paidLabel = this.page.getByText(t.workOrderDetail.statusPaid);
    await paidLabel.waitFor(visibleTimeout);
    assert.ok(await paidLabel.isVisible());
  }
);

// --- Scenario 6 & 7: Avisos accionables ---

Given(
  "que estoy autenticado en la aplicación",
  async function (this: CustomWorld) {
    await this.setSession("consumer");
    await this.stubGet("/service-proposals", []);

    await this.page.goto(`${APP_URL}${ROUTES.consumer.services}`, {
      waitUntil: "domcontentloaded",
    });
  }
);

When(
  "recibo una notificación de servicio próximo a iniciar para una orden de trabajo",
  async function (this: CustomWorld) {
    const wo = aWorkOrder({
      id: 901,
      service_proposal_id: 901,
      status: "scheduled",
      description: "Servicio por comenzar",
    });
    await this.stubGet("/work-orders/901", wo);

    await sendWsEvent(this, {
      type: "notification.created",
      notification: {
        id: 901,
        user_id: 1,
        type: "work_order_close_to_scheduled_time",
        resource_type: "work_order",
        resource_id: 901,
        created_at: new Date().toISOString(),
      },
    });
  }
);

Then(
  "veo un aviso en pantalla indicando que el servicio está próximo a iniciar",
  async function (this: CustomWorld) {
    const notice = this.page.getByText(
      t.notifications.workOrderCloseToScheduledTime.title
    );
    await notice.waitFor(visibleTimeout);
    assert.ok(await notice.isVisible());
  }
);

Then(
  "puedo interactuar con la acción para abrir el detalle de la orden",
  async function (this: CustomWorld) {
    const actionBtn = this.page.getByRole("button", {
      name: t.notifications.workOrderCloseToScheduledTime.action,
    });
    await actionBtn.waitFor(visibleTimeout);
    assert.ok(await actionBtn.isVisible());
    await actionBtn.click();

    const modal = this.page.getByTestId("work-order-detail-modal");
    await modal.waitFor(visibleTimeout);
    assert.ok(await modal.isVisible());

    const orderNumber = this.page.getByText("#901");
    await orderNumber.waitFor(visibleTimeout);
    assert.ok(await orderNumber.isVisible());
  }
);

When(
  "recibo una notificación de reautorización requerida para Google Calendar",
  async function (this: CustomWorld) {
    await sendWsEvent(this, {
      type: "notification.created",
      notification: {
        id: 0,
        user_id: 1,
        type: "calendar_reauthorization_required",
        resource_type: "calendar_connection",
        resource_id: 1,
        created_at: new Date().toISOString(),
      },
    });
  }
);

Then(
  "veo un aviso en pantalla indicando que se requiere reautorizar Google Calendar",
  async function (this: CustomWorld) {
    const notice = this.page.getByText(
      t.notifications.calendarReauthorizationRequired.title
    );
    await notice.waitFor(visibleTimeout);
    assert.ok(await notice.isVisible());
  }
);

Then(
  "puedo interactuar con la acción para reautorizar la cuenta",
  async function (this: CustomWorld) {
    const actionBtn = this.page.getByRole("button", {
      name: t.notifications.calendarReauthorizationRequired.action,
    });
    await actionBtn.waitFor(visibleTimeout);
    assert.ok(await actionBtn.isVisible());
    assert.strictEqual(await actionBtn.isEnabled(), true);
  }
);

// --- Scenario 8: Evento repetido ---

When(
  "recibo la misma notificación de recordatorio más de una vez",
  async function (this: CustomWorld) {
    const event = {
      type: "notification.created",
      notification: {
        id: 950,
        user_id: 1,
        type: "work_order_close_to_scheduled_time",
        resource_type: "work_order",
        resource_id: 950,
        created_at: new Date().toISOString(),
      },
    };
    await sendWsEvent(this, event);
    await sendWsEvent(this, event);
  }
);

Then(
  "la pantalla permanece utilizable y no se muestra un aviso duplicado",
  async function (this: CustomWorld) {
    const notice = this.page.getByText(
      t.notifications.workOrderCloseToScheduledTime.title
    );
    await notice.waitFor(visibleTimeout);
    assert.ok(await notice.isVisible());

    const toastCount = await this.page
      .locator('[data-testid^="notification-toast-"]')
      .count();
    assert.strictEqual(toastCount, 1);
  }
);

// --- Scenario 9: Eventos inválidos o desconocidos ---

When(
  "recibo un evento con tipo desconocido o estructura inválida por WebSocket",
  async function (this: CustomWorld) {
    await sendWsEvent(this, {
      type: "unknown.weird.event",
      payload: { some: "data" },
    });
    await sendWsEvent(this, {
      type: "notification.created",
      notification: { corrupted: true },
    });
  }
);

Then(
  "la pantalla permanece utilizable y los recursos existentes se conservan intactos",
  async function (this: CustomWorld) {
    const title = this.page.getByRole("heading", {
      name: t.serviceProposals.sectionTitle,
    });
    await title.waitFor(visibleTimeout);
    assert.ok(await title.isVisible());
  }
);

// --- Scenario 10: Error al refrescar y recuperación ---

Given(
  "que tengo abierto el detalle de una orden de trabajo con datos previamente cargados",
  async function (this: CustomWorld) {
    await this.setSession("consumer");
    const proposal = aProposal("consumer", {
      id: 9901,
      status: "accepted",
      description: "Pintura de fachada",
    });
    const wo = aWorkOrder({
      id: 9901,
      service_proposal_id: 9901,
      status: "scheduled",
      description: "Pintura de fachada",
    });

    await this.stubGet("/service-proposals", [proposal]);
    await this.stubGet("/work-orders?service_proposal_id=9901", wo);
    await this.stubGet("/work-orders/9901", wo);

    await openWorkOrderModalDirectly(
      this,
      9901,
      `${APP_URL}${ROUTES.consumer.services}`
    );
    const scheduledLabel = this.page.getByText(t.workOrderDetail.statusScheduled);
    await scheduledLabel.waitFor(visibleTimeout);
    assert.ok(await scheduledLabel.isVisible());
  }
);

When(
  "falla la actualización remota disparada tras recibir una notificación de la orden",
  async function (this: CustomWorld) {
    // Make subsequent fetch fail with 500
    await this.stubGet(
      "/work-orders/9901",
      { message: "Internal server error" },
      500
    );

    await sendWsEvent(this, {
      type: "notification.created",
      notification: {
        id: 9901,
        user_id: 1,
        type: "work_order_completion_reported",
        resource_type: "work_order",
        resource_id: 9901,
        created_at: new Date().toISOString(),
      },
    });
  }
);

Then(
  "se conservan visibles los datos previos de la orden y se muestra una opción para reintentar",
  async function (this: CustomWorld) {
    // Previous data is still visible!
    const orderNum = this.page.getByText("#9901");
    await orderNum.waitFor(visibleTimeout);
    assert.ok(await orderNum.isVisible());

    const scheduledLabel = this.page.getByText(t.workOrderDetail.statusScheduled);
    await scheduledLabel.waitFor(visibleTimeout);
    assert.ok(await scheduledLabel.isVisible());

    // Recovery retry button is displayed!
    const errBanner = this.page.getByTestId("work-order-refresh-error");
    await errBanner.waitFor(visibleTimeout);
    assert.ok(await errBanner.isVisible());

    const retryBtn = this.page.getByRole("button", {
      name: t.notifications.refreshError.retry,
    });
    await retryBtn.waitFor(visibleTimeout);
    assert.ok(await retryBtn.isVisible());
    assert.strictEqual(await retryBtn.isEnabled(), true);
  }
);
