import { Given, Then, When } from "@cucumber/cucumber";
import assert from "assert";
import type { PaymentIntentStatus } from "../../domain/payment/types";
import type { AuthSession } from "../../infrastructure/auth/types";
import { MOCK_SESSION_COOKIE } from "../../infrastructure/auth/mock-adapter";
import { ROUTES } from "../../lib/routes";
import { page } from "./landing_page_visualization_steps";
import { addApiStub } from "./stubs-helper";

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

async function setConsumerSession(): Promise<void> {
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

  await page.context().addCookies([{
    name: MOCK_SESSION_COOKIE,
    value: encodeURIComponent(JSON.stringify(session)),
    domain: "localhost",
    path: "/",
  }]);
}

async function stubPendingProposal(): Promise<void> {
  await addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: [{
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
    }],
  });
  await addApiStub({
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
  await addApiStub({ method: "GET", endpoint: "/job-requests", status: 200, body: [] });
  await addApiStub({
    method: "GET",
    endpoint: "/service-proposals",
    status: 200,
    body: [proposalFixture()],
  });
}

async function openProposalDetail(): Promise<void> {
  await page.goto(`${APP_URL}${ROUTES.consumer.messages}?provider_id=${PROVIDER_ID}`);
  const panel = page.getByTestId("service-proposal-panel");
  await panel.waitFor({ state: "visible", timeout: 15_000 });
  await panel.click();
  await page.getByRole("dialog", { name: "Propuesta de Servicio" }).waitFor({ state: "visible" });
}

async function stubCheckout(status: number): Promise<void> {
  await addApiStub({
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
  await page.route(CHECKOUT_URL, async (route) => {
    await route.fulfill({ status: 200, contentType: "text/html", body: "<title>Checkout</title>" });
  });
}

async function storeActivePayment(): Promise<void> {
  await page.goto(APP_URL);
  await page.evaluate(({ paymentIntentId, serviceProposalId }) => {
    sessionStorage.setItem("activePayment", JSON.stringify({
      purpose: "booking_deposit",
      paymentIntentId,
      serviceProposalId,
      expiresOn: "2026-08-11T20:30:00Z",
    }));
  }, { paymentIntentId: PAYMENT_INTENT_ID, serviceProposalId: PROPOSAL_ID });
}

async function stubPaymentIntent(status: PaymentIntentStatus): Promise<void> {
  await addApiStub({
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

Given("que soy un consumidor autenticado con una propuesta de servicio pendiente", async () => {
  returnPath = "";
  transition = null;
  observedCheckoutUrl = "";
  checkoutRequestCount = 0;
  pollingRequestCount = 0;
  requestCountAfterTimeout = 0;
  await setConsumerSession();
  await stubPendingProposal();
});

When("consulto el detalle de la propuesta", async () => {
  await openProposalDetail();
});

Then("veo una reserva de {string}", async (amount: string) => {
  const row = page.getByText("Reserva", { exact: true }).locator("..");
  assert.ok(normalizeText(await row.textContent()).includes(normalizeText(amount)));
});

Then("veo una comisión de {string}", async (amount: string) => {
  const row = page.getByText("Comisión de la plataforma", { exact: true }).locator("..");
  assert.ok(normalizeText(await row.textContent()).includes(normalizeText(amount)));
});

Then("veo un total a pagar de {string}", async (amount: string) => {
  const row = page.getByText("Total a pagar", { exact: true }).locator("..");
  assert.ok(normalizeText(await row.textContent()).includes(normalizeText(amount)));
});

Then("veo la acción {string}", async (actionName: string) => {
  assert.ok(await page.getByRole("button", { name: actionName }).isVisible());
});

Given("que el checkout de la propuesta responde con estado HTTP {int}", async (status: number) => {
  await stubCheckout(status);
});

When("elijo pagar la reserva", async () => {
  await openProposalDetail();
  await page.getByRole("button", { name: "Pagar reserva" }).click();
  await page.waitForURL(CHECKOUT_URL, { timeout: 10_000 });
  observedCheckoutUrl = page.url();
  await page.goto(APP_URL);
});

Then("se conserva el contexto del pago de reserva en esta sesión", async () => {
  const activePayment = await page.evaluate(() => sessionStorage.getItem("activePayment"));
  assert.deepStrictEqual(JSON.parse(activePayment ?? "null"), {
    purpose: "booking_deposit",
    paymentIntentId: PAYMENT_INTENT_ID,
    serviceProposalId: PROPOSAL_ID,
    expiresOn: "2026-08-11T20:30:00Z",
  });
});

Then("soy redirigido exactamente a la URL de checkout informada por el servicio", () => {
  assert.strictEqual(observedCheckoutUrl, CHECKOUT_URL);
});

Given("que la creación del checkout está en curso", async () => {
  await stubCheckout(201);
  await page.route(`**/consumidor/mensajes?provider_id=${PROVIDER_ID}`, async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    checkoutRequestCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await route.continue();
  });
});

When("intento pagar la reserva dos veces", async () => {
  await openProposalDetail();
  checkoutRequestCount = 0;
  const button = page.getByRole("button", { name: "Pagar reserva" });
  await button.evaluate((element: HTMLButtonElement) => {
    element.click();
    element.click();
  });
});

Then("la acción de pago permanece deshabilitada durante la solicitud", async () => {
  await page.getByRole("button", { name: "Preparando pago…" }).waitFor({ state: "visible" });
  assert.ok(await page.getByRole("button", { name: "Preparando pago…" }).isDisabled());
});

Then("se solicita un único checkout para la propuesta", async () => {
  await page.waitForURL(CHECKOUT_URL, { timeout: 10_000 });
  assert.strictEqual(checkoutRequestCount, 1);
});

Given("que regreso por la ruta de pago exitoso con la referencia externa del pago", async () => {
  returnPath = paymentReturnPath("success");
  await storeActivePayment();
});

Given("el estado verificado cambia de {string} a {string}", async (from: PaymentIntentStatus, to: PaymentIntentStatus) => {
  transition = { from, to };
  await stubPaymentIntent(from);
});

When("se consulta el resultado del pago", async () => {
  assert.ok(returnPath, "No se configuró una ruta de retorno");
  const response = await page.goto(`${APP_URL}${returnPath}`);
  assert.strictEqual(response?.status(), 200, "La ruta de retorno no respondió HTTP 200");

  if (transition) {
    const initialHeading = transition.from === "processing" ? "Pago en proceso" : "Esperando confirmación";
    await page.getByRole("heading", { name: initialHeading }).waitFor({ state: "visible", timeout: 10_000 });
    await stubPaymentIntent(transition.to);
    await page.getByRole("heading", { name: "Pago de reserva confirmado" }).waitFor({ state: "visible", timeout: 10_000 });
    return;
  }

  await page.getByRole("heading").first().waitFor({ state: "visible" });
});

Then("la propuesta y los listados relacionados reflejan la confirmación", async () => {
  assert.strictEqual(await page.evaluate(() => sessionStorage.getItem("activePayment")), null);
  await addApiStub({
    method: "GET",
    endpoint: "/service-proposals",
    status: 200,
    body: [proposalFixture("accepted")],
  });
  await page.getByRole("link", { name: "Volver a mis propuestas" }).click();
  await page.waitForURL(`${APP_URL}${ROUTES.consumer.services}`);
  await page.getByRole("tab", { name: "Aceptadas" }).click();
  await page.getByText("Aceptada", { exact: true }).waitFor({ state: "visible" });
});

Then("puedo volver a mis propuestas", async () => {
  if (page.url() === `${APP_URL}${ROUTES.consumer.services}`) return;
  assert.ok(await page.getByRole("link", { name: "Volver a mis propuestas" }).isVisible());
});

Given("que regreso por la ruta de pago pendiente sin referencia externa", () => {
  returnPath = paymentReturnPath("pending", "");
});

Given("existe un pago de reserva activo guardado en esta sesión", async () => {
  await storeActivePayment();
});

Given("que regreso desde Mercado Pago por la ruta de pago {word}", async (kind: string) => {
  returnPath = paymentReturnPath(kind);
  await storeActivePayment();
});

Given("el backend informa que el pago está {string}", async (status: PaymentIntentStatus) => {
  await stubPaymentIntent(status);
});

Then("veo el resultado {string}", async (message: string) => {
  const heading = page.getByRole("heading", { name: message });
  await heading.waitFor({ state: "visible", timeout: 10_000 });
  assert.ok(await heading.isVisible());
});

Then("puedo volver a la propuesta para iniciar un nuevo pago", async () => {
  assert.ok(await page.getByRole("link", { name: "Volver a la propuesta" }).isVisible());
});

Given("que regreso por la ruta de pago exitoso con el parámetro {string}", (parameter: string) => {
  returnPath = paymentReturnPath("success", `external_reference=${PAYMENT_INTENT_ID}&${parameter}`);
});

Then("veo que el pago continúa en proceso", async () => {
  const heading = page.getByRole("heading", { name: "Pago en proceso" });
  await heading.waitFor({ state: "visible", timeout: 10_000 });
  assert.ok(await heading.isVisible());
});

Then("no veo el mensaje {string}", async (message: string) => {
  assert.strictEqual(await page.getByText(message, { exact: true }).count(), 0);
});

Given("que el backend mantiene el pago en estado {string}", async (status: PaymentIntentStatus) => {
  returnPath = paymentReturnPath("pending");
  await stubPaymentIntent(status);
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/payments/pending")) {
      pollingRequestCount += 1;
    }
  });
});

When("transcurren treinta segundos desde la primera consulta", { timeout: 40_000 }, async () => {
  const response = await page.goto(`${APP_URL}${returnPath}`);
  assert.strictEqual(response?.status(), 200, "La ruta de retorno no respondió HTTP 200");
  await page.getByRole("heading", { name: "Pago en proceso" }).waitFor({ state: "visible" });
  await page.waitForTimeout(30_500);
  requestCountAfterTimeout = pollingRequestCount;
});

Then("no se realizan más consultas automáticas", async () => {
  await page.waitForTimeout(3_000);
  assert.strictEqual(pollingRequestCount, requestCountAfterTimeout);
});

Then("puedo consultar nuevamente el estado del pago", async () => {
  assert.ok(await page.getByRole("button", { name: "Consultar nuevamente" }).isVisible());
});

Given("que regreso desde Mercado Pago sin referencia externa ni un pago activo guardado", async () => {
  returnPath = paymentReturnPath("failure", "status=rejected&payment_id=123");
  await page.goto(APP_URL);
  await page.evaluate(() => sessionStorage.removeItem("activePayment"));
});

When("se intenta consultar el resultado del pago", async () => {
  const response = await page.goto(`${APP_URL}${returnPath}`);
  assert.strictEqual(response?.status(), 200, "La ruta de retorno no respondió HTTP 200");
  await page.getByRole("heading", { name: "No pudimos identificar el pago" }).waitFor({ state: "visible" });
});

Then("veo un mensaje neutral que no afirma que el pago fue rechazado", async () => {
  assert.ok(await page.getByRole("heading", { name: "No pudimos identificar el pago" }).isVisible());
  assert.strictEqual(await page.getByText(/fue rechazado/i).count(), 0);
});

Given("que regreso desde Mercado Pago con un pago identificable", () => {
  returnPath = paymentReturnPath("success");
});

Given("mi sesión vence antes de verificar el resultado", async () => {
  await addApiStub({
    method: "GET",
    endpoint: `/payment-intents/${PAYMENT_INTENT_ID}`,
    status: 401,
    body: { error: "Unauthorized" },
  });
});

Then("se me solicita iniciar sesión nuevamente", async () => {
  const heading = page.getByRole("heading", { name: "Necesitás iniciar sesión nuevamente" });
  await heading.waitFor({ state: "visible", timeout: 10_000 });
  assert.ok(await heading.isVisible());
  assert.ok(await page.getByRole("link", { name: "Iniciar sesión" }).isVisible());
});

Then("no veo un mensaje que afirme que el pago falló", async () => {
  assert.strictEqual(await page.getByText(/el pago falló/i).count(), 0);
});

Given("que el servicio de pagos responde con estado HTTP {int}", async (status: number) => {
  returnPath = paymentReturnPath("pending");
  await addApiStub({
    method: "GET",
    endpoint: `/payment-intents/${PAYMENT_INTENT_ID}`,
    status,
    body: { error: "Internal detail" },
  });
});

When("intento continuar con el pago de reserva", async () => {
  const response = await page.goto(`${APP_URL}${returnPath}`);
  assert.strictEqual(response?.status(), 200, "La ruta de retorno no respondió HTTP 200");
  await page.getByRole("heading").first().waitFor({ state: "visible" });
});

Then("veo el mensaje de pago {string}", async (message: string) => {
  const messageElement = page.getByText(message, { exact: true });
  await messageElement.waitFor({ state: "visible", timeout: 10_000 });
  assert.ok(await messageElement.isVisible());
});

Then("puedo reintentar la operación", async () => {
  assert.ok(await page.getByRole("button", { name: "Consultar nuevamente" }).isVisible());
});
