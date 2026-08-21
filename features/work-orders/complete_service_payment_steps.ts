import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, APP_URL } from "../support/world";
import {
  aProposal,
  aWorkOrder,
  aServiceBalanceCheckoutSession,
  aPaymentIntent,
} from "../support/factories";
import { openWorkOrderDetailModal } from "./view_work_order_detail_steps";
import { ROUTES } from "../../lib/routes";

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
    (this as any).paymentPurpose = "service_balance";
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

Given(
  "que la creación del checkout del saldo está en curso",
  async function (this: CustomWorld) {
    (this as any).balanceCheckoutRequestCount = 0;
    await this.stubPost(
      `/work-orders/${WORK_ORDER_ID}/checkout-sessions`,
      200,
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
    await this.page.route(`**${ROUTES.consumer.services}**`, async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      (this as any).balanceCheckoutRequestCount =
        ((this as any).balanceCheckoutRequestCount || 0) + 1;
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
  }
);

When(
  "intento pagar el saldo dos veces",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("work-order-detail-modal");
    const isVisible = await modal.isVisible().catch(() => false);
    if (!isVisible) {
      await openWorkOrderDetailModal(this);
    }

    const payButton = this.page.getByRole("button", {
      name: /Pagar saldo del servicio|Preparando pago/i,
    });
    await payButton.waitFor({ state: "visible", timeout: 10_000 });

    (this as any).balanceCheckoutRequestCount = 0;

    await payButton.evaluate((element: HTMLButtonElement) => {
      element.click();
      element.click();
    });
  }
);

Then(
  "la acción de pagar saldo permanece deshabilitada durante la solicitud",
  async function (this: CustomWorld) {
    const payButton = this.page.getByRole("button", {
      name: /Preparando pago/i,
    });
    await payButton.waitFor({ state: "visible", timeout: 10_000 });
    const isDisabled = await payButton.isDisabled();
    const ariaBusy = await payButton.getAttribute("aria-busy");
    assert.ok(
      isDisabled || ariaBusy === "true",
      "La acción de pagar saldo debe permanecer deshabilitada durante la solicitud"
    );
  }
);

Then(
  "se solicita un único checkout para el saldo de la orden",
  async function (this: CustomWorld) {
    await this.page.waitForURL(CHECKOUT_URL, { timeout: 10_000 });
    const count = (this as any).balanceCheckoutRequestCount ?? 0;
    assert.strictEqual(
      count,
      1,
      `Se esperaba un único request de checkout pero se registraron ${count}`
    );
  }
);

Given(
  "que regreso por la ruta de pago exitoso con la referencia externa del pago del saldo",
  async function (this: CustomWorld) {
    await this.setSession("consumer");
    await this.stubGet("/service-proposals", [
      aProposal("consumer", {
        id: PROPOSAL_ID,
        amount_cents: TOTAL_AMOUNT_CENTS,
        status: "accepted",
      }),
    ]);
    const paidWorkOrder = aWorkOrder({
      id: WORK_ORDER_ID,
      service_proposal_id: PROPOSAL_ID,
      amount_cents: TOTAL_AMOUNT_CENTS,
      status: "paid",
      paid_on: "2026-08-20T14:30:00Z",
    });
    await this.stubGet(`/work-orders?service_proposal_id=${PROPOSAL_ID}`, paidWorkOrder);
    await this.stubGet(`/work-orders/${WORK_ORDER_ID}`, paidWorkOrder);

    await this.stubGet(
      `/payment-intents/${PAYMENT_INTENT_ID}`,
      aPaymentIntent("checkout_ready", { id: PAYMENT_INTENT_ID })
    );

    await this.page.goto(APP_URL);
    await this.page.evaluate(
      ({ paymentIntentId, workOrderId }) => {
        sessionStorage.setItem(
          "activePayment",
          JSON.stringify({
            purpose: "service_balance",
            paymentIntentId,
            workOrderId,
            expiresOn: "2026-08-25T20:30:00Z",
          })
        );
      },
      { paymentIntentId: PAYMENT_INTENT_ID, workOrderId: WORK_ORDER_ID }
    );

    (this as any).paymentIntentId = PAYMENT_INTENT_ID;
    (this as any).returnPath = `/payments/success?payment_intent_id=${PAYMENT_INTENT_ID}&external_reference=${PAYMENT_INTENT_ID}`;
  }
);

Then(
  "la orden de trabajo refleja el estado {string}",
  async function (this: CustomWorld, expectedStatus: string) {
    const raw = await this.page.evaluate(() =>
      sessionStorage.getItem("activePayment")
    );
    assert.strictEqual(
      raw,
      null,
      "El contexto del pago activo debe haberse limpiado de sessionStorage"
    );

    const modal = this.page.getByTestId("work-order-detail-modal");
    const isModalVisible = await modal.isVisible().catch(() => false);
    if (isModalVisible) {
      const statusBadge = modal.getByText(new RegExp(expectedStatus, "i"));
      await statusBadge.waitFor({ state: "visible", timeout: 5_000 });
      assert.ok(await statusBadge.isVisible());
    }
  }
);

Then(
  "puedo volver a mis servicios",
  async function (this: CustomWorld) {
    const link = this.page.getByRole("link", {
      name: /Volver a mis (servicios|propuestas)/i,
    });
    await link.waitFor({ state: "visible", timeout: 10_000 });
    assert.ok(await link.isVisible());
    const href = await link.getAttribute("href");
    assert.strictEqual(href, ROUTES.consumer.services);
  }
);

Given(
  "que regreso por la ruta de pago pendiente sin referencia externa",
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
    (this as any).returnPath = "/payments/pending";
  }
);

Given(
  "existe un pago de saldo activo guardado en esta sesión",
  async function (this: CustomWorld) {
    await this.page.goto(APP_URL);
    await this.page.evaluate(
      ({ paymentIntentId, workOrderId }) => {
        sessionStorage.setItem(
          "activePayment",
          JSON.stringify({
            purpose: "service_balance",
            paymentIntentId,
            workOrderId,
            expiresOn: "2026-08-25T20:30:00Z",
          })
        );
      },
      { paymentIntentId: PAYMENT_INTENT_ID, workOrderId: WORK_ORDER_ID }
    );
    await this.stubGet(
      `/payment-intents/${PAYMENT_INTENT_ID}`,
      aPaymentIntent("processing", { id: PAYMENT_INTENT_ID })
    );
    (this as any).paymentIntentId = PAYMENT_INTENT_ID;
  }
);

Given(
  "que regreso por la ruta de pago exitoso con el parámetro {string}",
  async function (this: CustomWorld, param: string) {
    if ((this as any).paymentPurpose === "booking_deposit") {
      const intentId = "intent-e2e-123";
      (this as any).paymentIntentId = intentId;
      (this as any).returnPath = `/payments/success?external_reference=${intentId}&${param}`;
      return;
    }

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

    (this as any).paymentIntentId = PAYMENT_INTENT_ID;
    (this as any).returnPath = `/payments/success?payment_intent_id=${PAYMENT_INTENT_ID}&${param}`;
  }
);

Given(
  "el backend informa que el pago del saldo está {string}",
  async function (this: CustomWorld, status: string) {
    const intentId = (this as any).paymentIntentId || PAYMENT_INTENT_ID;
    await this.stubGet(
      `/payment-intents/${intentId}`,
      aPaymentIntent(status, { id: intentId })
    );
  }
);

Then(
  "veo que el pago continúa en proceso",
  async function (this: CustomWorld) {
    const textElement = this.page.getByText("Pago en proceso");
    await textElement.waitFor({ state: "visible", timeout: 10_000 });
    assert.ok(await textElement.isVisible());
  }
);

Given(
  "que el backend mantiene el pago del saldo en estado {string}",
  async function (this: CustomWorld, status: string) {
    await this.setSession("consumer");
    await this.stubGet(
      `/payment-intents/${PAYMENT_INTENT_ID}`,
      aPaymentIntent(status as any, { id: PAYMENT_INTENT_ID })
    );

    await this.page.goto(APP_URL);
    await this.page.evaluate(
      ({ paymentIntentId, workOrderId }) => {
        sessionStorage.setItem(
          "activePayment",
          JSON.stringify({
            purpose: "service_balance",
            paymentIntentId,
            workOrderId,
            expiresOn: "2026-08-25T20:30:00Z",
          })
        );
      },
      { paymentIntentId: PAYMENT_INTENT_ID, workOrderId: WORK_ORDER_ID }
    );

    (this as any).paymentIntentId = PAYMENT_INTENT_ID;
    (this as any).returnPath = "/payments/pending";
    (this as any).pollingRequestCount = 0;
    this.page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/payments/pending")) {
        (this as any).pollingRequestCount = ((this as any).pollingRequestCount || 0) + 1;
      }
    });
  }
);

Given(
  "que regreso desde Mercado Pago sin referencia externa ni un pago activo guardado",
  async function (this: CustomWorld) {
    if ((this as any).paymentPurpose === "booking_deposit") {
      (this as any).returnPath = "/payments/failure?status=rejected&payment_id=123";
      await this.page.goto(APP_URL);
      await this.page.evaluate(() => sessionStorage.removeItem("activePayment"));
      return;
    }

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

    await this.page.goto(APP_URL);
    await this.page.evaluate(() => sessionStorage.removeItem("activePayment"));
    (this as any).returnPath = "/payments/pending";
  }
);

When(
  "se intenta consultar el resultado del pago",
  async function (this: CustomWorld) {
    const targetPath = (this as any).returnPath || "/payments/pending";
    const response = await this.page.goto(`${APP_URL}${targetPath}`);
    assert.strictEqual(
      response?.status(),
      200,
      "La ruta de retorno no respondió HTTP 200"
    );
    await this.page
      .getByRole("heading", { name: "No pudimos identificar el pago" })
      .waitFor({ state: "visible", timeout: 10_000 });
  }
);

Then(
  "veo un mensaje neutral que no afirma que el pago fue rechazado",
  async function (this: CustomWorld) {
    const heading = this.page.getByRole("heading", {
      name: "No pudimos identificar el pago",
    });
    await heading.waitFor({ state: "visible", timeout: 10_000 });
    assert.ok(await heading.isVisible());
    assert.strictEqual(await this.page.getByText(/fue rechazado/i).count(), 0);
  }
);

Given(
  "que regreso desde Mercado Pago por la ruta de pago {word}",
  async function (this: CustomWorld, returnRoute: string) {
    if ((this as any).paymentPurpose === "booking_deposit") {
      (this as any).paymentIntentId = "intent-e2e-123";
      (this as any).returnPath = `/payments/${returnRoute}?external_reference=intent-e2e-123`;
      await this.page.goto(APP_URL);
      await this.page.evaluate(
        ({ paymentIntentId, serviceProposalId }) => {
          sessionStorage.setItem(
            "activePayment",
            JSON.stringify({
              purpose: "booking_deposit",
              paymentIntentId,
              serviceProposalId,
              expiresOn: "2026-08-11T20:30:00Z",
            })
          );
        },
        { paymentIntentId: "intent-e2e-123", serviceProposalId: 10 }
      );
      return;
    }

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

    await this.page.goto(APP_URL);
    await this.page.evaluate(
      ({ paymentIntentId, workOrderId }) => {
        sessionStorage.setItem(
          "activePayment",
          JSON.stringify({
            purpose: "service_balance",
            paymentIntentId,
            workOrderId,
            expiresOn: "2026-08-25T20:30:00Z",
          })
        );
      },
      { paymentIntentId: PAYMENT_INTENT_ID, workOrderId: WORK_ORDER_ID }
    );

    (this as any).paymentIntentId = PAYMENT_INTENT_ID;
    (this as any).returnPath = `/payments/${returnRoute}`;
  }
);

Then(
  "puedo volver a la orden de trabajo para iniciar un nuevo pago",
  async function (this: CustomWorld) {
    const link = this.page.getByRole("link", {
      name: /Volver a la orden de trabajo|Volver a mis servicios/i,
    });
    await link.waitFor({ state: "visible", timeout: 10_000 });
    assert.ok(await link.isVisible());
    const href = await link.getAttribute("href");
    assert.strictEqual(href, ROUTES.consumer.services);
  }
);



