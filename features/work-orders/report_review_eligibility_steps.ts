import { Given, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld } from "../support/world";
import {
  aCategory,
  aCompletionReport,
  aProposal,
  aReview,
  aWorkOrder,
} from "../support/factories";
import type { WorkOrderReview } from "../../domain/work-order/types";

const PROPOSAL_ID = 42;
const WORK_ORDER_ID = 10;
const REVIEW_RATING = 4;
const REVIEW_COMMENT = "La reseña original se conserva.";

Given(
  "que consulto una orden de trabajo como {string}",
  async function (this: CustomWorld, actor: string) {
    const role =
      actor === "consumidor titular"
        ? "consumer"
        : actor === "prestador titular"
          ? "provider"
          : null;
    assert.ok(role, `Unexpected work order actor: ${actor}`);

    await this.setSession(role);
    this.selectedRole = role;
    await this.stubGet("/categories", [aCategory()]);
    await this.stubGet(
      "/service-proposals",
      [aProposal(role, { id: PROPOSAL_ID, status: "accepted" })]
    );
  }
);

Given(
  "la orden {string}",
  async function (this: CustomWorld, reviewState: string) {
    let review: WorkOrderReview | undefined;
    if (reviewState === "tiene una reseña visible") {
      review = aReview({
        rating: REVIEW_RATING,
        comment: REVIEW_COMMENT,
        description: REVIEW_COMMENT,
      });
    } else {
      assert.strictEqual(reviewState, "no tiene reseña disponible");
    }

    const workOrder = aWorkOrder({
      id: WORK_ORDER_ID,
      service_proposal_id: PROPOSAL_ID,
      status: "paid",
      paid_on: "2026-08-20T14:30:00Z",
      completion_report: aCompletionReport(),
      ...(review ? { review } : {}),
    });

    await this.stubGet(`/work-orders?service_proposal_id=${PROPOSAL_ID}`, workOrder);
    await this.stubGet(`/work-orders/${WORK_ORDER_ID}`, workOrder);
  }
);

Then(
  "no veo la opción para reportar la reseña",
  async function (this: CustomWorld) {
    const detail = this.page.getByTestId("work-order-detail-modal");
    await detail.getByText(/^pagada$/i).waitFor({ state: "visible", timeout: 10000 });
    const review = detail.getByTestId("work-order-review-section");
    if (this.selectedRole === "consumer") {
      await review.waitFor({ state: "visible", timeout: 5000 });
    } else {
      assert.strictEqual(await review.count(), 0);
    }
    assert.strictEqual(await detail.getByTestId("report-review-button").count(), 0);
    assert.strictEqual(
      await detail.getByRole("button", { name: /reportar reseña/i }).count(),
      0
    );
  }
);
