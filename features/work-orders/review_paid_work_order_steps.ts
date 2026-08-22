import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld } from "../support/world";
import {
  aProposal,
  aWorkOrder,
  aCompletionReport,
  aReview,
  aCategory,
} from "../support/factories";
import { openWorkOrderDetailModal } from "./view_work_order_detail_steps";

const PROPOSAL_ID = 10;
const WORK_ORDER_ID = 10;

async function setupPaidWorkOrderForReview(world: CustomWorld) {
  await world.setSession("consumer");
  await world.stubGet("/categories", [aCategory()]);
  await world.stubGet("/service-proposals", [
    aProposal("consumer", {
      id: PROPOSAL_ID,
      amount_cents: 1500000,
      status: "accepted",
    }),
  ]);
  const workOrder = aWorkOrder({
    id: WORK_ORDER_ID,
    service_proposal_id: PROPOSAL_ID,
    status: "paid",
    amount_cents: 1500000,
    paid_on: "2026-08-20T14:30:00Z",
    completion_report: aCompletionReport(),
  });
  await world.stubGet(`/work-orders?service_proposal_id=${PROPOSAL_ID}`, workOrder);
  await world.stubGet(`/work-orders/${WORK_ORDER_ID}`, workOrder);
}

export async function openReviewWorkOrderModal(world: CustomWorld) {
  const detailModal = world.page.getByTestId("work-order-detail-modal");
  if (!(await detailModal.isVisible().catch(() => false))) {
    await openWorkOrderDetailModal(world);
  }
  const rateButton = world.page
    .getByRole("button", { name: /calificar( servicio)?/i })
    .or(world.page.getByTestId("rate-work-order-button"));
  await rateButton.waitFor({ state: "visible", timeout: 10000 });
  await rateButton.click();

  const reviewModal = world.page.getByTestId("review-work-order-modal");
  await reviewModal.waitFor({ state: "visible", timeout: 10000 });
}

// ─── Background ─────────────────────────────────────────────────────────────

Given(
  "que soy un consumidor autenticado con una orden de trabajo pagada",
  async function (this: CustomWorld) {
    await setupPaidWorkOrderForReview(this);
  }
);

// ─── Scenario 01 & Form Interactions ────────────────────────────────────────

Given(
  "tengo abierto el formulario de calificación de la orden",
  async function (this: CustomWorld) {
    await openReviewWorkOrderModal(this);
  }
);

Given(
  /^(?:seleccioné|selecciono) una calificación de (\d+) estrellas?$/,
  async function (this: CustomWorld, ratingStr: string) {
    const rating = parseInt(ratingStr, 10);
    const modal = this.page.getByTestId("review-work-order-modal");
    const starBtn = modal
      .getByRole("button", { name: new RegExp(`${rating} estrella`, "i") })
      .or(modal.getByTestId(`star-rating-${rating}`))
      .or(modal.locator(`button[data-rating="${rating}"]`));
    await starBtn.waitFor({ state: "visible", timeout: 5000 });
    await starBtn.click();
    (this as any).selectedRating = rating;
  }
);

Given(
  /^(?:ingresé|ingreso) el comentario "([^"]*)"$/,
  async function (this: CustomWorld, comment: string) {
    const modal = this.page.getByTestId("review-work-order-modal");
    const textarea = modal
      .getByRole("textbox", { name: /comentario|reseña|opinión|descripción/i })
      .or(modal.getByTestId("review-comment-input"))
      .or(modal.locator("textarea"));
    await textarea.waitFor({ state: "visible", timeout: 5000 });
    await textarea.fill(comment);
    (this as any).reviewComment = comment;
  }
);

When(
  "envío la reseña",
  async function (this: CustomWorld) {
    const rating = (this as any).selectedRating ?? 5;
    const comment = (this as any).reviewComment ?? "";
    await this.stubPost(
      `/work-orders/${WORK_ORDER_ID}/reviews`,
      201,
      aReview({ rating, comment, description: comment })
    );
    await this.stubGet(
      `/work-orders/${WORK_ORDER_ID}`,
      aWorkOrder({
        id: WORK_ORDER_ID,
        service_proposal_id: PROPOSAL_ID,
        status: "paid",
        paid_on: "2026-08-20T14:30:00Z",
        completion_report: aCompletionReport(),
        review: aReview({ rating, comment, description: comment }),
      })
    );

    const modal = this.page.getByTestId("review-work-order-modal");
    const submitBtn = modal
      .getByRole("button", { name: /enviar reseña|calificar/i })
      .or(modal.getByTestId("submit-review-button"));
    await submitBtn.waitFor({ state: "visible", timeout: 5000 });
    await submitBtn.click();
  }
);

Then(
  "veo el mensaje de confirmación de reseña registrada",
  async function (this: CustomWorld) {
    const successMsg = this.page
      .getByText(/reseña registrada|calificación guardada|calificación registrada|gracias por calificar/i)
      .or(this.page.getByTestId("review-success-message"));
    await successMsg.waitFor({ state: "visible", timeout: 10000 });
    assert.ok(await successMsg.isVisible());
  }
);

Then(
  /^(?:el detalle de la orden muestra la calificación de|veo la calificación de) (\d+) estrellas?$/,
  async function (this: CustomWorld, ratingStr: string) {
    const rating = parseInt(ratingStr, 10);
    const modal = this.page.getByTestId("work-order-detail-modal");
    await modal.waitFor({ state: "visible", timeout: 10000 });
    const reviewSection = modal.getByTestId("work-order-review-section");
    await reviewSection.waitFor({ state: "visible", timeout: 10000 });
    const filledStars = reviewSection.getByTestId("star-filled");
    assert.strictEqual(await filledStars.count(), rating);
  }
);

Then(
  "el detalle de la orden muestra el comentario {string}",
  async function (this: CustomWorld, comment: string) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    await modal.waitFor({ state: "visible", timeout: 10000 });
    const commentEl = modal.getByText(new RegExp(comment, "i"));
    await commentEl.waitFor({ state: "visible", timeout: 5000 });
    assert.ok(await commentEl.isVisible());
  }
);

Then(
  "no se muestra la opción para volver a calificar",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    const rateBtn = modal
      .getByRole("button", { name: /calificar( servicio)?/i })
      .or(modal.getByTestId("rate-work-order-button"));
    const count = await rateBtn.count();
    assert.strictEqual(count === 0 || !(await rateBtn.isVisible()), true);
  }
);
