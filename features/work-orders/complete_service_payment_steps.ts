import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, APP_URL } from "../support/world";
import {
  aProposal,
  aWorkOrder,
  aServiceBalanceCheckoutSession,
} from "../support/factories";
import { openWorkOrderDetailModal } from "./view_work_order_detail_steps";

const PROPOSAL_ID = 10;
const WORK_ORDER_ID = 10;
const TOTAL_AMOUNT_CENTS = 10_000_000;
const PAYMENT_INTENT_ID = "intent-balance-e2e-123";
const CHECKOUT_URL =
  "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=balance-123";

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

Given(
  "que el checkout del saldo responde con estado HTTP {int}",
  async function (this: CustomWorld, status: number) {
    await this.stubPost(
      `/work-orders/${WORK_ORDER_ID}/checkout-sessions`,
      status,
      aServiceBalanceCheckoutSession({
        payment_intent_id: PAYMENT_INTENT_ID,
        checkout_url: CHECKOUT_URL,
      })
    );
    await this.page.route(CHECKOUT_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Mercado Pago Checkout</body></html>",
      });
    });
  }
);

When(
  "elijo pagar el saldo del servicio",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    const isVisible = await modal.isVisible().catch(() => false);
    if (!isVisible) {
      await openWorkOrderDetailModal(this);
    }

    const payButton = this.page.getByRole("button", {
      name: "Pagar saldo del servicio",
    });
    await payButton.waitFor({ state: "visible", timeout: 10_000 });
    await payButton.click();

    await this.page.waitForURL(CHECKOUT_URL, { timeout: 10_000 });
    (this as any).observedCheckoutUrl = this.page.url();
    (this as any).expectedCheckoutUrl = CHECKOUT_URL;
    await this.page.goto(APP_URL);
  }
);

Then(
  "se conserva el contexto del pago del saldo en esta sesión",
  async function (this: CustomWorld) {
    const raw = await this.page.evaluate(() =>
      sessionStorage.getItem("activePayment")
    );
    assert.ok(raw, "activePayment should exist in sessionStorage");
    const activePayment = JSON.parse(raw);
    assert.strictEqual(activePayment.purpose, "service_balance");
    assert.strictEqual(activePayment.workOrderId, WORK_ORDER_ID);
    assert.strictEqual(activePayment.paymentIntentId, PAYMENT_INTENT_ID);
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
