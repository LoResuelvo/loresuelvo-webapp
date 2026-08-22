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
import { ROUTES } from "../../lib/routes";

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
    .getByTestId("open-review-button")
    .or(world.page.getByRole("button", { name: /calificar( servicio)?/i }))
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

Given(
  "que el registro de la reseña demora en responder",
  async function (this: CustomWorld) {
    await this.stubPost(
      `/work-orders/${WORK_ORDER_ID}/reviews`,
      201,
      aReview({ rating: 5, comment: "Excelente servicio", description: "Excelente servicio" })
    );
    await this.page.route("**/*", async (route) => {
      const req = route.request();
      const isServerAction =
        req.method() === "POST" &&
        (Boolean(req.headers()["next-action"]) ||
          req.url().includes(ROUTES.consumer.services));
      const isDirectReview =
        req.method() === "POST" && req.url().includes("/reviews");

      if (isServerAction || isDirectReview) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      await route.continue();
    });
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
  /^(?:envío|hago clic en enviar) (?:la )?reseña$/,
  async function (this: CustomWorld) {
    const rating = (this as any).selectedRating ?? 5;
    const comment = (this as any).reviewComment ?? "";
    if (!(this as any).hasCustomReviewStub) {
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
    }

    const modal = this.page.getByTestId("review-work-order-modal");
    const submitBtn = modal
      .getByTestId("submit-review-button")
      .or(modal.getByRole("button", { name: /enviar reseña|calificar/i }));
    await submitBtn.waitFor({ state: "visible", timeout: 5000 });
    await submitBtn.click();
  }
);


Then(
  "veo el botón de envío en estado {string} y deshabilitado",
  async function (this: CustomWorld, expectedText: string) {
    const modal = this.page.getByTestId("review-work-order-modal");
    const submitBtn = modal
      .getByTestId("submit-review-button")
      .or(modal.getByRole("button", { name: new RegExp(expectedText, "i") }));
    await submitBtn.waitFor({ state: "visible", timeout: 5000 });
    assert.ok(await submitBtn.isDisabled(), "El botón de envío no está deshabilitado");
    const text = await submitBtn.textContent();
    assert.ok(
      text?.toLowerCase().includes(expectedText.toLowerCase()),
      `El texto del botón no incluye "${expectedText}" (recibido: "${text}")`
    );
  }
);


Then(
  "veo el mensaje de confirmación de reseña registrada",
  async function (this: CustomWorld) {
    const successMsg = this.page.getByTestId("review-success-message");
    await successMsg.waitFor({ state: "visible", timeout: 10000 });
    assert.ok(await successMsg.isVisible());

    const closeBtn = successMsg.getByRole("button", { name: /cerrar/i });
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
    }
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
  "no se muestra ningún comentario en la reseña",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    await modal.waitFor({ state: "visible", timeout: 10000 });
    const reviewSection = modal.getByTestId("work-order-review-section");
    await reviewSection.waitFor({ state: "visible", timeout: 10000 });
    const commentParagraph = reviewSection.locator("p");
    const count = await commentParagraph.count();
    assert.strictEqual(count, 0, "Se visualiza un comentario cuando no debería");
  }
);

Then(
  "no se muestra la opción para volver a calificar",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    const rateBtn = modal
      .getByTestId("open-review-button")
      .or(modal.getByRole("button", { name: /calificar( servicio)?/i }))
      .or(modal.getByTestId("rate-work-order-button"));
    const count = await rateBtn.count();
    assert.strictEqual(count === 0 || !(await rateBtn.isVisible()), true);
  }
);

// ─── Scenario 04 & Form Validation ──────────────────────────────────────────

When(
  "abro el formulario de calificación",
  async function (this: CustomWorld) {
    const rateBtn = this.page
      .getByTestId("open-review-button")
      .or(this.page.getByRole("button", { name: /calificar( servicio)?/i }))
      .or(this.page.getByTestId("rate-work-order-button"));
    await rateBtn.waitFor({ state: "visible", timeout: 10000 });
    await rateBtn.click();

    const reviewModal = this.page.getByTestId("review-work-order-modal");
    await reviewModal.waitFor({ state: "visible", timeout: 10000 });
  }
);

Then(
  "el botón de envío se encuentra deshabilitado",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("review-work-order-modal");
    const submitBtn = modal
      .getByTestId("submit-review-button")
      .or(modal.getByRole("button", { name: /enviar reseña|calificar/i }));
    await submitBtn.waitFor({ state: "visible", timeout: 5000 });
    assert.ok(await submitBtn.isDisabled(), "El botón de envío debería estar deshabilitado");
  }
);

// ─── Scenario 05 & Character Count ──────────────────────────────────────────

When(
  /^escribo una descripción de (\d+) caracteres$/,
  async function (this: CustomWorld, lengthStr: string) {
    const length = parseInt(lengthStr, 10);
    const text = "A".repeat(length);
    const modal = this.page.getByTestId("review-work-order-modal");
    const textarea = modal
      .getByTestId("review-comment-input")
      .or(modal.locator("textarea"));
    await textarea.waitFor({ state: "visible", timeout: 5000 });
    await textarea.fill(text);
  }
);

Then(
  "veo el contador de caracteres en {string}",
  async function (this: CustomWorld, expectedCount: string) {
    const modal = this.page.getByTestId("review-work-order-modal");
    const counter = modal
      .getByTestId("review-char-counter")
      .or(modal.getByText(expectedCount));
    await counter.waitFor({ state: "visible", timeout: 5000 });
    const text = await counter.textContent();
    assert.ok(
      text?.includes(expectedCount),
      `Contador esperado "${expectedCount}", pero se obtuvo "${text}"`
    );
  }
);

Then(
  "el campo no permite ingresar más de 500 caracteres",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("review-work-order-modal");
    const textarea = modal
      .getByTestId("review-comment-input")
      .or(modal.locator("textarea"));
    await textarea.pressSequentially("EXTRA_CHARS");
    const value = await textarea.inputValue();
    assert.ok(
      value.length <= 500,
      `El campo contiene ${value.length} caracteres, superando el límite de 500`
    );
    const maxLength = await textarea.getAttribute("maxlength");
    assert.strictEqual(maxLength, "500");
  }
);

// ─── Scenario 06 & Role / State Restrictions ────────────────────────────────

Given(
  "que la orden de trabajo se encuentra en estado {string}",
  async function (this: CustomWorld, status: string) {
    await this.setSession("consumer");
    await this.stubGet("/categories", [aCategory()]);
    await this.stubGet("/service-proposals", [
      aProposal("consumer", {
        id: PROPOSAL_ID,
        amount_cents: 1500000,
        status: "accepted",
      }),
    ]);
    const workOrder = aWorkOrder({
      id: WORK_ORDER_ID,
      service_proposal_id: PROPOSAL_ID,
      status: status as "scheduled" | "awaiting_payment" | "paid",
      amount_cents: 1500000,
      completion_report: status === "awaiting_payment" ? aCompletionReport() : undefined,
    });

    await this.stubGet(`/work-orders?service_proposal_id=${PROPOSAL_ID}`, workOrder);
    await this.stubGet(`/work-orders/${WORK_ORDER_ID}`, workOrder);
  }
);

Then(
  "no veo el botón para calificar el servicio",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    await modal.waitFor({ state: "visible", timeout: 10000 });
    const rateBtn = modal
      .getByTestId("open-review-button")
      .or(modal.getByRole("button", { name: /calificar( servicio)?/i }))
      .or(modal.getByTestId("rate-work-order-button"));
    const count = await rateBtn.count();
    assert.strictEqual(count === 0 || !(await rateBtn.isVisible()), true, "El botón para calificar no debería ser visible");
  }
);

// ─── Scenario 07 & 409 Conflict Handling ────────────────────────────────────

Given(
  "que el servidor responde con conflicto 409 al registrar la reseña",
  async function (this: CustomWorld) {
    (this as any).hasCustomReviewStub = true;
    await this.stubPost(
      `/work-orders/${WORK_ORDER_ID}/reviews`,
      409,
      { code: "ALREADY_REVIEWED", message: "Esta orden de trabajo ya cuenta con una reseña registrada." }
    );
  }
);

Then(
  "veo un mensaje de error indicando que la orden ya fue calificada",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("review-work-order-modal");
    const errorBox = modal
      .getByTestId("review-error-message")
      .or(modal.getByRole("alert"));
    await errorBox.waitFor({ state: "visible", timeout: 10000 });
    assert.ok(await errorBox.isVisible(), "El mensaje de error no es visible");
    const text = await errorBox.textContent();
    assert.ok(
      text?.toLowerCase().includes("ya cuenta con una reseña") ||
      text?.toLowerCase().includes("ya fue calificada"),
      `Texto de error inesperado: "${text}"`
    );
  }
);





