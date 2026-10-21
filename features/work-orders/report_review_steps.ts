import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld } from "../support/world";
import {
  aCategory,
  aCompletionReport,
  aProposal,
  aReview,
  aWorkOrder,
} from "../support/factories";
import { openWorkOrderDetailModal } from "./view_work_order_detail_steps";

const PROPOSAL_ID = 42;
const WORK_ORDER_ID = 10;
const REVIEW_RATING = 4;
const REVIEW_COMMENT = "La reseña original se conserva.";

async function setupReviewReportScenario(world: CustomWorld) {
  await world.setSession("provider");
  await world.stubGet("/categories", [aCategory()]);
  await world.stubGet(
    "/service-proposals",
    [aProposal("provider", { id: PROPOSAL_ID, status: "accepted" })]
  );

  const workOrder = aWorkOrder({
    id: WORK_ORDER_ID,
    service_proposal_id: PROPOSAL_ID,
    status: "paid",
    paid_on: "2026-08-20T14:30:00Z",
    completion_report: aCompletionReport(),
    review: aReview({ rating: REVIEW_RATING, comment: REVIEW_COMMENT, description: REVIEW_COMMENT }),
  });

  await world.stubGet(`/work-orders?service_proposal_id=${PROPOSAL_ID}`, workOrder);
  await world.stubGet(`/work-orders/${WORK_ORDER_ID}`, workOrder);
  await world.stubPost(`/work-orders/${WORK_ORDER_ID}/reviews/reports`, 201, {
    id: 71,
    status: "pending",
  });
}

Given(
  "que soy el prestador titular de una orden con una reseña visible",
  async function (this: CustomWorld) {
    await setupReviewReportScenario(this);
  }
);

Given(
  "que soy el prestador titular y tengo abierto el formulario para reportar una reseña",
  async function (this: CustomWorld) {
    await setupReviewReportScenario(this);
    await openWorkOrderDetailModal(this);

    const detail = this.page.getByTestId("work-order-detail-modal");
    const reportButton = detail
      .getByRole("button", { name: /reportar reseña/i })
      .or(detail.getByTestId("report-review-button"));
    await reportButton.waitFor({ state: "visible", timeout: 5000 });
    await reportButton.click();
    await this.page.getByTestId("report-review-modal").waitFor({ state: "visible" });
  }
);

Given(
  "el formulario tiene {string}",
  async function (this: CustomWorld, problem: string) {
    const modal = this.page.getByTestId("report-review-modal");
    if (problem === "ningún motivo seleccionado") return;

    assert.strictEqual(
      problem,
      "un motivo válido y más de 500 caracteres de explicación",
      "Unexpected review report form problem"
    );
    await modal.getByLabel(/motivo/i).selectOption({ label: "Datos personales" });
    await modal.getByLabel(/explicación/i).fill("😀".repeat(501));
  }
);

When(
  "intento enviar el reporte de la reseña",
  async function (this: CustomWorld) {
    await this.page
      .getByTestId("report-review-modal")
      .getByRole("button", { name: /enviar reporte/i })
      .click();
  }
);

Then(
  "veo una indicación de {string}",
  async function (this: CustomWorld, correction: string) {
    const alert = this.page.getByTestId("report-review-modal").getByRole("alert");
    await alert.waitFor({ state: "visible", timeout: 5000 });
    if (correction === "seleccionar un motivo") {
      assert.match(await alert.innerText(), /motivo/i);
    } else {
      assert.strictEqual(correction, "reducir la explicación a 500 caracteres");
      assert.match(await alert.innerText(), /500 caracteres/i);
    }
  }
);

Then(
  "el reporte no se envía",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("report-review-modal");
    assert.strictEqual(await modal.getByTestId("report-review-success-message").count(), 0);
    assert.strictEqual(await modal.getByRole("alert").count(), 1);
  }
);

Then(
  "conservo los datos ingresados para corregirlos",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("report-review-modal");
    const reason = modal.getByLabel(/motivo/i);
    const explanation = modal.getByLabel(/explicación/i);
    const reasonValue = await reason.inputValue();
    const explanationValue = await explanation.inputValue();

    if (reasonValue === "") {
      assert.strictEqual(explanationValue, "");
    } else {
      assert.strictEqual(reasonValue, "personal_data");
      assert.strictEqual(Array.from(explanationValue).length, 501);
      assert.strictEqual(explanationValue, "😀".repeat(501));
    }
  }
);


Given(
  "tengo abierto el formulario para reportar la reseña",
  async function (this: CustomWorld) {
    await openWorkOrderDetailModal(this);

    const detail = this.page.getByTestId("work-order-detail-modal");
    const reportButton = detail
      .getByRole("button", { name: /reportar reseña/i })
      .or(detail.getByTestId("report-review-button"));
    await reportButton.waitFor({ state: "visible", timeout: 5000 });
    await reportButton.click();
    await this.page.getByTestId("report-review-modal").waitFor({ state: "visible" });
  }
);

Given(
  "seleccioné el motivo {string}",
  async function (this: CustomWorld, reason: string) {
    const modal = this.page.getByTestId("report-review-modal");
    await modal.getByLabel(/motivo/i).selectOption({ label: reason });
  }
);

Given(
  "dejé la explicación {string}",
  async function (this: CustomWorld, explanation: string) {
    const modal = this.page.getByTestId("report-review-modal");
    await modal.getByLabel(/explicación/i).fill(explanation);
  }
);

When(
  "envío el reporte de la reseña",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("report-review-modal");
    await modal.getByRole("button", { name: /enviar reporte/i }).click();
  }
);

Then(
  "veo una confirmación de que el reporte fue recibido para revisión",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("report-review-modal");
    const confirmation = modal.getByTestId("report-review-success-message");
    await confirmation.waitFor({ state: "visible", timeout: 10000 });
    await modal.getByRole("button", { name: /cerrar/i }).click();
  }
);

Then(
  "la reseña conserva su comentario y sus estrellas",
  async function (this: CustomWorld) {
    const detail = this.page.getByTestId("work-order-detail-modal");
    const review = detail.getByTestId("work-order-review-section");
    await review.waitFor({ state: "visible", timeout: 10000 });
    assert.ok(await review.getByText(REVIEW_COMMENT).isVisible());
    assert.strictEqual(await review.getByTestId("star-filled").count(), REVIEW_RATING);
  }
);

Then(
  "no se ofrece volver a reportarla en el detalle actual",
  async function (this: CustomWorld) {
    const reportButton = this.page
      .getByTestId("work-order-detail-modal")
      .getByTestId("report-review-button");
    assert.strictEqual(await reportButton.count(), 0);
  }
);
