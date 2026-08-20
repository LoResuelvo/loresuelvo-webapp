import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, APP_URL } from "../support/world";
import { aProposal, aWorkOrder, aCompletionReport, aReview } from "../support/factories";

const PROPOSAL_ID = 42;
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
    await this.stubGet(
      `/work-orders/${WORK_ORDER_ID}`,
      aWorkOrder({ id: WORK_ORDER_ID, service_proposal_id: PROPOSAL_ID, status: "scheduled" })
    );
  }
);

Given(
  'que la orden de trabajo está en estado "awaiting_payment" con evidencia de finalización',
  async function (this: CustomWorld) {
    await this.stubGet(
      `/work-orders/${WORK_ORDER_ID}`,
      aWorkOrder({
        id: WORK_ORDER_ID,
        service_proposal_id: PROPOSAL_ID,
        status: "awaiting_payment",
        completion_report: aCompletionReport(),
      })
    );
  }
);

Given(
  'que la orden de trabajo está en estado "paid" con evidencia de finalización',
  async function (this: CustomWorld) {
    await this.stubGet(
      `/work-orders/${WORK_ORDER_ID}`,
      aWorkOrder({
        id: WORK_ORDER_ID,
        service_proposal_id: PROPOSAL_ID,
        status: "paid",
        paid_on: "2026-08-20T14:30:00Z",
        completion_report: aCompletionReport(),
      })
    );
  }
);

Given(
  'que la orden de trabajo está en estado "paid" con reseña de 5 estrellas',
  async function (this: CustomWorld) {
    await this.stubGet(
      `/work-orders/${WORK_ORDER_ID}`,
      aWorkOrder({
        id: WORK_ORDER_ID,
        service_proposal_id: PROPOSAL_ID,
        status: "paid",
        paid_on: "2026-08-20T14:30:00Z",
        review: aReview({ rating: 5 }),
      })
    );
  }
);

Given(
  "que la consulta de la orden de trabajo demora en responder",
  async function (this: CustomWorld) {
    await this.page.route(`**/work-orders/${WORK_ORDER_ID}`, async () => {
      // Intentionally never fulfill to observe loading state
    });
  }
);

Given(
  "que el servidor responde con error al consultar el detalle de la orden",
  async function (this: CustomWorld) {
    await this.stubGet(`/work-orders/${WORK_ORDER_ID}`, { message: "Internal server error" }, 500);
  }
);

When(
  "abro el detalle de la orden de trabajo",
  async function (this: CustomWorld) {
    // Navigate to proposals view
    await this.page.goto(`${APP_URL}/consumidor/mis-servicios`);
    
    // Switch to Aceptadas tab
    const acceptedTab = this.page.getByRole("tab", { name: /aceptadas/i });
    if (await acceptedTab.isVisible()) {
      await acceptedTab.click();
    }
    
    // Click on the accepted proposal card to open proposal detail modal
    const proposalCard = this.page.getByRole("listitem").first();
    await proposalCard.click();
    
    // Click "Ver detalle de la orden" button inside proposal detail modal
    const viewDetailButton = this.page.getByRole("button", { name: /ver detalle de la orden/i });
    await viewDetailButton.click();
  }
);

Given(
  "tengo abierto el detalle de la orden de trabajo",
  async function (this: CustomWorld) {
    await this.page.goto(`${APP_URL}/consumidor/mis-servicios`);
    const acceptedTab = this.page.getByRole("tab", { name: /aceptadas/i });
    if (await acceptedTab.isVisible()) {
      await acceptedTab.click();
    }
    const proposalCard = this.page.getByRole("listitem").first();
    await proposalCard.click();
    const viewDetailButton = this.page.getByRole("button", { name: /ver detalle de la orden/i });
    await viewDetailButton.click();
  }
);

When(
  "hago clic en una foto de evidencia",
  async function (this: CustomWorld) {
    const photoThumbnail = this.page.getByRole("button", { name: /evidencia/i }).first();
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
