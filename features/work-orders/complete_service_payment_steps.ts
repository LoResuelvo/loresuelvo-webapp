import { Given, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld } from "../support/world";
import { aProposal, aWorkOrder } from "../support/factories";

const PROPOSAL_ID = 10;
const WORK_ORDER_ID = 10;
const TOTAL_AMOUNT_CENTS = 10_000_000;

function normalizeText(value: string | null): string {
  return (value ?? "").replace(/\s+/g, "");
}

Given(
  "que soy un consumidor autenticado con una orden de trabajo pendiente de pago",
  async function (this: CustomWorld) {
    await this.setSession("consumer");
    await this.stubGet("/service-proposals", [
      aProposal("consumer", {
        id: PROPOSAL_ID,
        amount_cents: TOTAL_AMOUNT_CENTS,
        status: "accepted",
      }),
    ]);
    const workOrder = aWorkOrder({
      id: WORK_ORDER_ID,
      service_proposal_id: PROPOSAL_ID,
      amount_cents: TOTAL_AMOUNT_CENTS,
      status: "awaiting_payment",
    });
    await this.stubGet(`/work-orders?service_proposal_id=${PROPOSAL_ID}`, workOrder);
    await this.stubGet(`/work-orders/${WORK_ORDER_ID}`, workOrder);
  }
);

Then(
  "veo un saldo del servicio de {string}",
  async function (this: CustomWorld, amount: string) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    const row = modal.locator("dl div").filter({ hasText: /saldo del servicio/i });
    await row.waitFor({ state: "visible", timeout: 10_000 });
    const text = await row.textContent();
    assert.ok(
      normalizeText(text).includes(normalizeText(amount)),
      `Expected "${text}" to include "${amount}"`
    );
  }
);

Then(
  "veo una comisión pendiente de {string}",
  async function (this: CustomWorld, amount: string) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    const row = modal.locator("dl div").filter({ hasText: /comisi[oó]n/i });
    await row.waitFor({ state: "visible", timeout: 10_000 });
    const text = await row.textContent();
    assert.ok(
      normalizeText(text).includes(normalizeText(amount)),
      `Expected "${text}" to include "${amount}"`
    );
  }
);

Then(
  "veo un total a pagar de saldo de {string}",
  async function (this: CustomWorld, amount: string) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    const row = modal.locator("dl div").filter({ hasText: /total a pagar/i });
    await row.waitFor({ state: "visible", timeout: 10_000 });
    const text = await row.textContent();
    assert.ok(
      normalizeText(text).includes(normalizeText(amount)),
      `Expected "${text}" to include "${amount}"`
    );
  }
);
