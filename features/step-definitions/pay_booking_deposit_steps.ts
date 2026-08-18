import { Given, Then, When } from "@cucumber/cucumber";
import assert from "assert";
import type { PaymentIntentStatus } from "../../domain/payment/types";
import type { AuthSession } from "../../infrastructure/auth/types";
import { MOCK_SESSION_COOKIE } from "../../infrastructure/auth/mock-adapter";
import { ROUTES } from "../../lib/routes";
import { CustomWorld } from "../support/world";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const PROPOSAL_ID = 42;
const PROVIDER_ID = 20;
const PAYMENT_INTENT_ID = "intent-e2e-123";
const CHECKOUT_URL = "https://www.mercadopago.com.ar/checkout?pref_id=e2e-123";

let returnPath = "";
let transition: { from: PaymentIntentStatus; to: PaymentIntentStatus } | null = null;
let observedCheckoutUrl = "";
let checkoutRequestCount = 0;
let pollingRequestCount = 0;
let requestCountAfterTimeout = 0;

const pricing = {
  currency: "ARS",
  deposit_cents: 2_000_000,
  platform_fee_due_now_cents: 100_000,
  amount_due_now_cents: 2_100_000,
};

function proposalFixture(status: "pending" | "accepted" = "pending") {
  return {
    id: PROPOSAL_ID,
    conversation_id: 1,
    amount_cents: 10_000_000,
    scheduled_on: "2026-09-01T12:00:00Z",
    description: "Reparación de pérdida de agua",
    status,
    created_on: "2026-08-11T12:00:00Z",
    counterpart: {
      id: PROVIDER_ID,
      role: "provider",
      name: "Juan",
      surname: "Pérez",
      category_name: "Plomería",
    },
    booking_terms: {
      currency: "ARS",
      service_total_cents: 10_000_000,
      deposit_cents: pricing.deposit_cents,
      remaining_service_balance_cents: 8_000_000,
      platform_fee_total_cents: 500_000,
      platform_fee_due_now_cents: pricing.platform_fee_due_now_cents,
      remaining_platform_fee_cents: 400_000,
      amount_due_now_cents: pricing.amount_due_now_cents,
      remaining_amount_due_cents: 8_400_000,
      contract_total_cents: 10_500_000,
      booking_payment_deadline: "2026-08-31T12:00:00Z",
    },
  };
}

async function setConsumerSession(world: CustomWorld): Promise<void> {
  const session: AuthSession = {
    user: {
      id: "consumer-e2e",
      email: "consumer@loresuelvo.test",
      firstName: "Ana",
      lastName: "Pérez",
      isOnboarded: true,
      role: "consumer",
    },
    accessToken: "mock-access-token",
  };

  await world.page.context().addCookies([
    {
      name: MOCK_SESSION_COOKIE,
      value: encodeURIComponent(JSON.stringify(session)),
      domain: "localhost",
      path: "/",
    },
  ]);
}

async function stubPendingProposal(world: CustomWorld): Promise<void> {
  await world.addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: [
      {
        id: 1,
        status: "accepted",
        counterpart: {
          id: PROVIDER_ID,
          role: "provider",
          name: "Juan",
          surname: "Pérez",
          category_name: "Plomería",
        },
        last_message: null,
        updated_on: "2026-08-11T12:00:00Z",
      },
    ],
  });
  await world.addApiStub({
    method: "GET",
    endpoint: "/conversations/1",
    status: 200,
    body: {
      id: 1,
      status: "accepted",
      work: {
        counterpart: {
          id: PROVIDER_ID,
          role: "provider",
          name: "Juan",
          surname: "Pérez",
          category_name: "Plomería",
        },
      },
      messages: [],
      updated_on: "2026-08-11T12:00:00Z",
    },
  });
  await world.addApiStub({ method: "GET", endpoint: "/job-requests", status: 200, body: [] });
  await world.addApiStub({
    method: "GET",
    endpoint: "/service-proposals",
    status: 200,
    body: [proposalFixture()],
  });
}

async function openProposalDetail(world: CustomWorld): Promise<void> {
  await world.page.goto(`${APP_URL}${ROUTES.consumer.messages}?provider_id=${PROVIDER_ID}`);
  const panel = world.page.getByTestId("service-proposal-panel");
  await panel.waitFor({ state: "visible", timeout: 15_000 });
  await panel.click();
  await world.page.getByRole("dialog", { name: "Propuesta de Servicio" }).waitFor({ state: "visible" });
}

async function stubCheckout(world: CustomWorld, status: number): Promise<void> {
  await world.addApiStub({
    method: "POST",
    endpoint: `/service-proposals/${PROPOSAL_ID}/checkout-sessions`,
    status,
    body: {
      payment_intent_id: PAYMENT_INTENT_ID,
      status: "checkout_ready",
      checkout_url: CHECKOUT_URL,
      expires_on: "2026-08-11T20:30:00Z",
      pricing,
    },
  });
  await world.page.route(CHECKOUT_URL, async (route) => {
    await route.fulfill({ status: 200, contentType: "text/html", body: "<title>Checkout</title>" });
  });
}

async function storeActivePayment(world: CustomWorld): Promise<void> {
  await world.page.goto(APP_URL);
  await world.page.evaluate(
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
    { paymentIntentId: PAYMENT_INTENT_ID, serviceProposalId: PROPOSAL_ID }
  );
}

async function stubPaymentIntent(world: CustomWorld, status: PaymentIntentStatus): Promise<void> {
  await world.addApiStub({
    method: "GET",
    endpoint: `/payment-intents/${PAYMENT_INTENT_ID}`,
    status: 200,
    body: { status },
  });
}

function paymentReturnPath(kind: string, query = `external_reference=${PAYMENT_INTENT_ID}`): string {
  assert.ok(["success", "pending", "failure"].includes(kind), `Ruta de pago inválida: ${kind}`);
  return `/payments/${kind}${query ? `?${query}` : ""}`;
}

function normalizeText(value: string | null): string {
  return (value ?? "").replace(/\s+/g, "");
}

Given("que soy un consumidor autenticado con una propuesta de servicio pendiente", async function (this: CustomWorld) {
  returnPath = "";
  transition = null;
  observedCheckoutUrl = "";
  checkoutRequestCount = 0;
  pollingRequestCount = 0;
  requestCountAfterTimeout = 0;
  await setConsumerSession(this);
  await stubPendingProposal(this);
});

When("consulto el detalle de la propuesta", async function (this: CustomWorld) {
  await openProposalDetail(this);
});

Then("veo una reserva de {string}", async function (this: CustomWorld, amount: string) {
  const row = this.page.getByText("Reserva", { exact: true }).locator("..");
  assert.ok(normalizeText(await row.textContent()).includes(normalizeText(amount)));
});

Then("veo una comisión de {string}", async function (this: CustomWorld, amount: string) {
  const row = this.page.getByText("Comisión de la plataforma", { exact: true }).locator("..");
  assert.ok(normalizeText(await row.textContent()).includes(normalizeText(amount)));
});

Then("veo un total a pagar de {string}", async function (this: CustomWorld, amount: string) {
  const row = this.page.getByText("Total a pagar", { exact: true }).locator("..");
  assert.ok(normalizeText(await row.textContent()).includes(normalizeText(amount)));
});

Then("veo la acción {string}", async function (this: CustomWorld, actionName: string) {
  assert.ok(await this.page.getByRole("button", { name: actionName }).isVisible());
});

Given("que el checkout de la propuesta responde con estado HTTP {int}", async function (this: CustomWorld, status: number) {
  await stubCheckout(this, status);
});

When("elijo pagar la reserva", async function (this: CustomWorld) {
  await openProposalDetail(this);
  await this.page.getByRole("button", { name: "Pagar reserva" }).click();
  await this.page.waitForURL(CHECKOUT_URL, { timeout: 10_000 });
  observedCheckoutUrl = this.page.url();
  await this.page.goto(APP_URL);
});

Then("se conserva el contexto del pago de reserva en esta sesión", async function (this: CustomWorld) {
  const activePayment = await this.page.evaluate(() => sessionStorage.getItem("activePayment"));
  assert.deepStrictEqual(JSON.parse(activePayment ?? "null"), {
    purpose: "booking_deposit",
    paymentIntentId: PAYMENT_INTENT_ID,
    serviceProposalId: PROPOSAL_ID,
    expiresOn: "2026-08-11T20:30:00Z",
  });
});

Then("soy redirigido exactamente a la URL de checkout informada por el servicio", function (this: CustomWorld) {
  assert.strictEqual(observedCheckoutUrl, CHECKOUT_URL);
});

Given("que la creación del checkout está en curso", async function (this: CustomWorld) {
  await stubCheckout(this, 201);
  await this.page.route(`**/consumidor/mensajes?provider_id=${PROVIDER_ID}`, async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    checkoutRequestCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await route.continue();
  });
});

When("intento pagar la reserva dos veces", async function (this: CustomWorld) {
  await openProposalDetail(this);
  checkoutRequestCount = 0;
  const button = this.page.getByRole("button", { name: "Pagar reserva" });
  await button.evaluate((element: HTMLButtonElement) => {
    element.click();
    element.click();
  });
});

Then("la acción de pago permanece deshabilitada durante la solicitud", async function (this: CustomWorld) {
  await this.page.getByRole("button", { name: "Preparando pago…" }).waitFor({ state: "visible" });
  assert.ok(await this.page.getByRole("button", { name: "Preparando pago…" }).isDisabled());
});

Then("se solicita un único checkout para la propuesta", async function (this: CustomWorld) {
  await this.page.waitForURL(CHECKOUT_URL, { timeout: 10_000 });
  assert.strictEqual(checkoutRequestCount, 1);
});

Given("que regreso por la ruta de pago exitoso con la referencia externa del pago", async function (this: CustomWorld) {
  returnPath = paymentReturnPath("success");
  await storeActivePayment(this);
});

Given(
  "el estado verificado cambia de {string} a {string}",
  async function (this: CustomWorld, from: PaymentIntentStatus, to: PaymentIntentStatus) {
    transition = { from, to };
    await stubPaymentIntent(this, from);
  }
);

When("se consulta el resultado del pago", async function (this: CustomWorld) {
  assert.ok(returnPath, "No se configuró una ruta de retorno");
  const response = await this.page.goto(`${APP_URL}${returnPath}`);
  assert.strictEqual(response?.status(), 200, "La ruta de retorno no respondió HTTP 200");

  if (transition) {
    const initialHeading = transition.from === "processing" ? "Pago en proceso" : "Esperando confirmación";
    await this.page.getByRole("heading", { name: initialHeading }).waitFor({ state: "visible", timeout: 10_000 });
    await stubPaymentIntent(this, transition.to);
    await this.page.getByRole("heading", { name: "Pago de reserva confirmado" }).waitFor({ state: "visible", timeout: 10_000 });
    return;
  }

  await this.page.getByRole("heading").first().waitFor({ state: "visible" });
});

Then("la propuesta y los listados relacionados reflejan la confirmación", async function (this: CustomWorld) {
  assert.strictEqual(await this.page.evaluate(() => sessionStorage.getItem("activePayment")), null);
  await this.addApiStub({
    method: "GET",
    endpoint: "/service-proposals",
    status: 200,
    body: [proposalFixture("accepted")],
  });
  await this.page.getByRole("link", { name: "Volver a mis propuestas" }).click();
  await this.page.waitForURL(`${APP_URL}${ROUTES.consumer.services}`);
  await this.page.getByRole("tab", { name: "Aceptadas" }).click();
  await this.page.getByText("Aceptada", { exact: true }).waitFor({ state: "visible" });
});

Then("puedo volver a mis propuestas", async function (this: CustomWorld) {
  if (this.page.url() === `${APP_URL}${ROUTES.consumer.services}`) return;
  assert.ok(await this.page.getByRole("link", { name: "Volver a mis propuestas" }).isVisible());
});

Given("que regreso por la ruta de pago pendiente sin referencia externa", function (this: CustomWorld) {
  returnPath = paymentReturnPath("pending", "");
});

Given("existe un pago de reserva activo guardado en esta sesión", async function (this: CustomWorld) {
  await storeActivePayment(this);
});

Given("que regreso desde Mercado Pago por la ruta de pago {word}", async function (this: CustomWorld, kind: string) {
  returnPath = paymentReturnPath(kind);
  await storeActivePayment(this);
});

Given("el backend informa que el pago está {string}", async function (this: CustomWorld, status: PaymentIntentStatus) {
  await stubPaymentIntent(this, status);
});

Then("veo el resultado {string}", async function (this: CustomWorld, message: string) {
  const heading = this.page.getByRole("heading", { name: message });
  await heading.waitFor({ state: "visible", timeout: 10_000 });
  assert.ok(await heading.isVisible());
});

Then("puedo volver a la propuesta para iniciar un nuevo pago", async function (this: CustomWorld) {
  assert.ok(await this.page.getByRole("link", { name: "Volver a la propuesta" }).isVisible());
});

Given("que regreso por la ruta de pago exitoso con el parámetro {string}", function (this: CustomWorld, parameter: string) {
  returnPath = paymentReturnPath("success", `external_reference=${PAYMENT_INTENT_ID}&${parameter}`);
});

Then("veo que el pago continúa en proceso", async function (this: CustomWorld) {
  const heading = this.page.getByRole("heading", { name: "Pago en proceso" });
  await heading.waitFor({ state: "visible", timeout: 10_000 });
  assert.ok(await heading.isVisible());
});

Then("no veo el mensaje {string}", async function (this: CustomWorld, message: string) {
  assert.strictEqual(await this.page.getByText(message, { exact: true }).count(), 0);
});

Given("que el backend mantiene el pago en estado {string}", async function (this: CustomWorld, status: PaymentIntentStatus) {
  returnPath = paymentReturnPath("pending");
  await stubPaymentIntent(this, status);
  this.page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/payments/pending")) {
      pollingRequestCount += 1;
    }
  });
});

When("transcurren treinta segundos desde la primera consulta", { timeout: 40_000 }, async function (this: CustomWorld) {
  const response = await this.page.goto(`${APP_URL}${returnPath}`);
  assert.strictEqual(response?.status(), 200, "La ruta de retorno no respondió HTTP 200");
  await this.page.getByRole("heading", { name: "Pago en proceso" }).waitFor({ state: "visible" });
  await this.page.waitForTimeout(30_500);
  requestCountAfterTimeout = pollingRequestCount;
});

Then("no se realizan más consultas automáticas", async function (this: CustomWorld) {
  await this.page.waitForTimeout(3_000);
  assert.strictEqual(pollingRequestCount, requestCountAfterTimeout);
});

Then("puedo consultar nuevamente el estado del pago", async function (this: CustomWorld) {
  assert.ok(await this.page.getByRole("button", { name: "Consultar nuevamente" }).isVisible());
});

Given(
  "que regreso desde Mercado Pago sin referencia externa ni un pago activo guardado",
  async function (this: CustomWorld) {
    returnPath = paymentReturnPath("failure", "status=rejected&payment_id=123");
    await this.page.goto(APP_URL);
    await this.page.evaluate(() => sessionStorage.removeItem("activePayment"));
  }
);

When("se intenta consultar el resultado del pago", async function (this: CustomWorld) {
  const response = await this.page.goto(`${APP_URL}${returnPath}`);
  assert.strictEqual(response?.status(), 200, "La ruta de retorno no respondió HTTP 200");
  await this.page.getByRole("heading", { name: "No pudimos identificar el pago" }).waitFor({ state: "visible" });
});

Then("veo un mensaje neutral que no afirma que el pago fue rechazado", async function (this: CustomWorld) {
  assert.ok(await this.page.getByRole("heading", { name: "No pudimos identificar el pago" }).isVisible());
  assert.strictEqual(await this.page.getByText(/fue rechazado/i).count(), 0);
});

Given("que regreso desde Mercado Pago con un pago identificable", function (this: CustomWorld) {
  returnPath = paymentReturnPath("success");
});

Given("mi sesión vence antes de verificar el resultado", async function (this: CustomWorld) {
  await this.addApiStub({
    method: "GET",
    endpoint: `/payment-intents/${PAYMENT_INTENT_ID}`,
    status: 401,
    body: { error: "Unauthorized" },
  });
});

Then("se me solicita iniciar sesión nuevamente", async function (this: CustomWorld) {
  const heading = this.page.getByRole("heading", { name: "Necesitás iniciar sesión nuevamente" });
  await heading.waitFor({ state: "visible", timeout: 10_000 });
  assert.ok(await heading.isVisible());
  assert.ok(await this.page.getByRole("link", { name: "Iniciar sesión" }).isVisible());
});

Then("no veo un mensaje que afirme que el pago falló", async function (this: CustomWorld) {
  assert.strictEqual(await this.page.getByText(/el pago falló/i).count(), 0);
});

Given("que el servicio de pagos responde con estado HTTP {int}", async function (this: CustomWorld, status: number) {
  returnPath = paymentReturnPath("pending");
  await this.addApiStub({
    method: "GET",
    endpoint: `/payment-intents/${PAYMENT_INTENT_ID}`,
    status,
    body: { error: "Internal detail" },
  });
});

When("intento continuar con el pago de reserva", async function (this: CustomWorld) {
  const response = await this.page.goto(`${APP_URL}${returnPath}`);
  assert.strictEqual(response?.status(), 200, "La ruta de retorno no respondió HTTP 200");
  await this.page.getByRole("heading").first().waitFor({ state: "visible" });
});

Then("veo el mensaje de pago {string}", async function (this: CustomWorld, message: string) {
  const messageElement = this.page.getByText(message, { exact: true });
  await messageElement.waitFor({ state: "visible", timeout: 10_000 });
  assert.ok(await messageElement.isVisible());
});

Then("puedo reintentar la operación", async function (this: CustomWorld) {
  assert.ok(await this.page.getByRole("button", { name: "Consultar nuevamente" }).isVisible());
});
