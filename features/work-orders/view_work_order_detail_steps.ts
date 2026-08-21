import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, APP_URL } from "../support/world";
import { aProposal, aWorkOrder, aCompletionReport, aReview, anApiError } from "../support/factories";
import { ROUTES } from "../../lib/routes";

const PROPOSAL_ID = 10;
const WORK_ORDER_ID = 10;

Given(
  "que soy un consumidor autenticado con una propuesta de servicio aceptada",
  async function (this: CustomWorld) {
    await this.setSession("consumer");
    await this.stubGet("/service-proposals", [aProposal("consumer", { id: PROPOSAL_ID })]);
    await this.stubGet(
      `/work-orders?service_proposal_id=${PROPOSAL_ID}`,
      aWorkOrder({ id: WORK_ORDER_ID, service_proposal_id: PROPOSAL_ID, status: "scheduled" })
    );
  }
);

Given(
  "que soy un prestador autenticado con una propuesta pagada",
  async function (this: CustomWorld) {
    await this.setSession("provider");
    await this.stubGet("/service-proposals", [aProposal("provider", { id: PROPOSAL_ID })]);
    await this.stubGet(
      `/work-orders?service_proposal_id=${PROPOSAL_ID}`,
      aWorkOrder({ id: WORK_ORDER_ID, service_proposal_id: PROPOSAL_ID, status: "paid" })
    );
  }
);

Given(
  'que la orden de trabajo está en estado "scheduled"',
  async function (this: CustomWorld) {
    const wo = aWorkOrder({ id: WORK_ORDER_ID, service_proposal_id: 10, status: "scheduled" });
    await this.stubGet(`/work-orders/${WORK_ORDER_ID}`, wo);
    await this.stubGet(`/work-orders?service_proposal_id=10`, wo);
    await this.stubGet(`/work-orders?service_proposal_id=42`, { ...wo, service_proposal_id: 42 });
    await this.stubGet(`/work-orders/42`, { ...wo, id: 42, service_proposal_id: 42 });
  }
);

Given(
  'que la orden de trabajo está en estado "awaiting_payment" con evidencia de finalización',
  async function (this: CustomWorld) {
    const wo = aWorkOrder({
      id: WORK_ORDER_ID,
      service_proposal_id: 10,
      status: "awaiting_payment",
      completion_report: aCompletionReport(),
    });
    await this.stubGet(`/work-orders/${WORK_ORDER_ID}`, wo);
    await this.stubGet(`/work-orders?service_proposal_id=10`, wo);
    await this.stubGet(`/work-orders?service_proposal_id=42`, { ...wo, service_proposal_id: 42 });
    await this.stubGet(`/work-orders/42`, { ...wo, id: 42, service_proposal_id: 42 });
  }
);

Given(
  'que la orden de trabajo está en estado "paid" con evidencia de finalización',
  async function (this: CustomWorld) {
    const wo = aWorkOrder({
      id: WORK_ORDER_ID,
      service_proposal_id: 10,
      status: "paid",
      paid_on: "2026-08-20T14:30:00Z",
      completion_report: aCompletionReport(),
    });
    await this.stubGet(`/work-orders/${WORK_ORDER_ID}`, wo);
    await this.stubGet(`/work-orders?service_proposal_id=10`, wo);
    await this.stubGet(`/work-orders?service_proposal_id=42`, { ...wo, service_proposal_id: 42 });
    await this.stubGet(`/work-orders/42`, { ...wo, id: 42, service_proposal_id: 42 });
  }
);

Given(
  'que la orden de trabajo está en estado "paid" con reseña de 5 estrellas',
  async function (this: CustomWorld) {
    const wo = aWorkOrder({
      id: WORK_ORDER_ID,
      service_proposal_id: 10,
      status: "paid",
      paid_on: "2026-08-20T14:30:00Z",
      review: aReview({ rating: 5 }),
    });
    await this.stubGet(`/work-orders/${WORK_ORDER_ID}`, wo);
    await this.stubGet(`/work-orders?service_proposal_id=10`, wo);
    await this.stubGet(`/work-orders?service_proposal_id=42`, { ...wo, service_proposal_id: 42 });
    await this.stubGet(`/work-orders/42`, { ...wo, id: 42, service_proposal_id: 42 });
  }
);

Given(
  "que la consulta de la orden de trabajo demora en responder",
  async function (this: CustomWorld) {
    await this.page.route("**/*", async (route) => {
      const req = route.request();
      const isServerAction =
        req.method() === "POST" &&
        (Boolean(req.headers()["next-action"]) ||
          req.url().includes(ROUTES.consumer.services) ||
          req.url().includes(ROUTES.provider.jobs));

      const isDirectApi = req.url().includes(`/work-orders/${WORK_ORDER_ID}`);

      if (isServerAction || isDirectApi) {
        return;
      }
      await route.fallback();
    });
  }
);

Given(
  "que el servidor responde con error al consultar el detalle de la orden",
  async function (this: CustomWorld) {
    await this.stubGet(`/work-orders/${WORK_ORDER_ID}`, anApiError("Internal server error"), 500);
  }
);

export async function openWorkOrderDetailModal(world: CustomWorld) {
  const cookies = await world.page.context().cookies();
  const sessionCookie = cookies.find((c) => c.name === "__e2e_session");
  let isProvider = false;
  if (sessionCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(sessionCookie.value));
      isProvider = parsed?.user?.role === "provider";
    } catch {}
  }

  const targetUrl = isProvider
    ? `${APP_URL}${ROUTES.provider.jobs}`
    : `${APP_URL}${ROUTES.consumer.services}`;

  await world.page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await world.page.waitForLoadState("networkidle").catch(() => {});

  const tabAceptadas = world.page.getByRole("tab", { name: /aceptadas/i });
  await tabAceptadas.waitFor({ state: "visible", timeout: 10000 });

  for (let i = 0; i < 10; i++) {
    await tabAceptadas.click();
    await world.page.waitForTimeout(200);
    const isSelected = await tabAceptadas.getAttribute("aria-selected");
    if (isSelected === "true") break;
    await world.page.waitForTimeout(300);
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

When(
  "abro el detalle de la orden de trabajo",
  async function (this: CustomWorld) {
    await openWorkOrderDetailModal(this);
  }
);

Given(
  "tengo abierto el detalle de la orden de trabajo",
  async function (this: CustomWorld) {
    await openWorkOrderDetailModal(this);
  }
);

When(
  "hago clic en una foto de evidencia",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    const evidenceSection = modal.getByTestId("completion-evidence-section");
    await evidenceSection.waitFor({ state: "visible", timeout: 10000 });
    const photoThumbnail = evidenceSection.getByRole("button").first();
    await photoThumbnail.waitFor({ state: "visible", timeout: 10000 });
    await photoThumbnail.click();
  }
);

Then(
  "veo el monto acordado, la fecha programada y la descripción del servicio",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    await assert.doesNotReject(async () => {
      await modal.getByText(/15\.000/i).waitFor({ state: "visible", timeout: 5000 });
      await modal.getByText(/reparación de cañería/i).waitFor({ state: "visible", timeout: 5000 });
    });
  }
);

Then(
  'veo el estado {string}',
  async function (this: CustomWorld, statusLabel: string) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    const statusBadge = modal.getByText(new RegExp(statusLabel, "i"));
    await statusBadge.waitFor({ state: "visible", timeout: 5000 });
  }
);

Then(
  "no veo la sección de evidencia de finalización",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    const evidenceSection = modal.getByTestId("completion-evidence-section");
    assert.strictEqual(await evidenceSection.isVisible(), false);
  }
);

Then(
  'veo la sección {string}',
  async function (this: CustomWorld, sectionTitle: string) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    const section = modal.getByText(new RegExp(sectionTitle, "i"));
    await section.waitFor({ state: "visible", timeout: 5000 });
  }
);

Then(
  "veo la descripción de entrega del prestador",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    const deliveryDesc = modal.getByText(/trabajo finalizado correctamente/i);
    await deliveryDesc.waitFor({ state: "visible", timeout: 5000 });
  }
);

Then(
  "veo 2 fotos de evidencia",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    const evidenceSection = modal.getByTestId("completion-evidence-section");
    const images = evidenceSection.locator("img");
    await images.first().waitFor({ state: "visible", timeout: 5000 });
    const count = await images.count();
    assert.strictEqual(count, 2);
  }
);

Then(
  "se abre la foto ampliada en el visor de imágenes",
  async function (this: CustomWorld) {
    const lightboxModal = this.page.getByRole("dialog");
    await lightboxModal.waitFor({ state: "visible", timeout: 5000 });
    const fullImage = lightboxModal.locator("img");
    await fullImage.waitFor({ state: "visible", timeout: 5000 });
  }
);

Then(
  "veo la fecha de pago registrada",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    const paidInfo = modal.getByTestId("work-order-paid-info");
    await paidInfo.waitFor({ state: "visible", timeout: 5000 });
  }
);

Then(
  "veo un indicador de carga en el detalle",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    const loader = modal.getByTestId("work-order-detail-loading");
    await loader.waitFor({ state: "visible", timeout: 5000 });
  }
);

Then(
  "veo un mensaje de error al cargar el detalle",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    const errorAlert = modal.getByTestId("work-order-detail-error");
    await errorAlert.waitFor({ state: "visible", timeout: 5000 });
  }
);

Then(
  "veo la calificación con 5 estrellas",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    const reviewSection = modal.getByTestId("work-order-review-section");
    await reviewSection.waitFor({ state: "visible", timeout: 5000 });
  }
);

Then(
  "veo el comentario de la reseña",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    const comment = modal.getByText(/excelente servicio, muy puntual/i);
    await comment.waitFor({ state: "visible", timeout: 5000 });
  }
);
