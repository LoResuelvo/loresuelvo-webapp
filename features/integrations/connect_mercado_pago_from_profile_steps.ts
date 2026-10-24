import { Given, Then, When } from "@cucumber/cucumber";
import assert from "assert";
import type { PaymentAccountStatus } from "../../domain/payment-account/types";
import { ROUTES } from "../../lib/routes";
import { APP_URL, CustomWorld, visibleTimeout } from "../support/world";
import {
  aConnectedPaymentAccount,
  aPaymentAccount,
  aPaymentAuthorization,
} from "../support/factories";

const paymentAccountsEndpoint = "/providers/me/payment-accounts";

function paymentAccountStatusFromLabel(label: string): PaymentAccountStatus {
  if (label === "pending" || label === "connected") return label;
  throw new Error(`Estado de Mercado Pago no soportado: ${label}`);
}

async function prepareMercadoPagoProfileAuthorization(world: CustomWorld): Promise<void> {
  if (!(await world.hasApiStub("GET", paymentAccountsEndpoint))) {
    await world.stubGet(paymentAccountsEndpoint, aPaymentAccount());
  }
  await world.stubPost(
    "/providers/me/payment-accounts/authorization",
    201,
    aPaymentAuthorization(),
  );
  await world.page.route("**/auth.mercadopago.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body>Mock Mercado Pago Auth Page</body></html>",
    });
  });

  await world.page.goto(`${APP_URL}${ROUTES.provider.profile}`, {
    waitUntil: "domcontentloaded",
  });
  const connectButton = world.page
    .getByRole("region", { name: "Mercado Pago" })
    .getByRole("button", { name: "Vincular Mercado Pago", exact: true });
  await connectButton.waitFor(visibleTimeout);
}

async function selectMercadoPagoConnection(world: CustomWorld): Promise<void> {
  await world.page
    .getByRole("region", { name: "Mercado Pago" })
    .getByRole("button", { name: "Vincular Mercado Pago", exact: true })
    .click();
}

async function waitForMercadoPagoAuthorization(world: CustomWorld): Promise<void> {
  await world.page.waitForURL(
    (url) => url.hostname === "auth.mercadopago.com",
    visibleTimeout,
  );
}

Given(
  "mi cuenta de Mercado Pago para el perfil está {string}",
  async function (this: CustomWorld, status: string) {
    const paymentAccountStatus = paymentAccountStatusFromLabel(status);
    this.calendarConnectionStatus = "disconnected";

    if (this.calendarProfileRole === "provider") {
      await this.stubGet(
        paymentAccountsEndpoint,
        paymentAccountStatus === "connected"
          ? aConnectedPaymentAccount()
          : aPaymentAccount(),
      );
    }
  },
);

Given(
  "estoy en Mi perfil con una autorización de Mercado Pago disponible",
  async function (this: CustomWorld) {
    await prepareMercadoPagoProfileAuthorization(this);
  },
);

Given(
  "inicié la vinculación de Mercado Pago desde Mi perfil",
  async function (this: CustomWorld) {
    await prepareMercadoPagoProfileAuthorization(this);
    await selectMercadoPagoConnection(this);
    await waitForMercadoPagoAuthorization(this);
  },
);

When(
  "selecciono vincular Mercado Pago desde Mi perfil",
  async function (this: CustomWorld) {
    await selectMercadoPagoConnection(this);
  },
);

Then(
  "soy dirigido a la autorización existente de Mercado Pago",
  async function (this: CustomWorld) {
    await waitForMercadoPagoAuthorization(this);
    assert.ok(
      this.page.url().includes("/authorization?state=test-state"),
      `No se usó la URL de autorización existente. URL actual: ${this.page.url()}`,
    );
    await this.page.getByText("Mock Mercado Pago Auth Page").waitFor(visibleTimeout);
  },
);

When(
  "regreso de Mercado Pago con el resultado {string}",
  async function (this: CustomWorld, result: string) {
    if (result !== "success" && result !== "cancelled") {
      throw new Error(`Resultado de Mercado Pago no soportado: ${result}`);
    }

    await this.page.goto(
      `${APP_URL}${ROUTES.provider.mercadoPagoCallback}?result=${result}`,
      { waitUntil: "domcontentloaded" },
    );
    await this.page.waitForURL(
      (url) => url.pathname === ROUTES.provider.profile,
      visibleTimeout,
    );
  },
);

Then(
  "veo Mi perfil con la vinculación de Mercado Pago {string}",
  async function (this: CustomWorld, confirmation: string) {
    await this.page.getByRole("heading", { name: "Mi perfil" }).waitFor(visibleTimeout);
    const card = this.page.getByRole("region", { name: "Mercado Pago" });
    await card.waitFor(visibleTimeout);

    if (confirmation === "Confirmada por el backend") {
      await card.getByText("Vinculada", { exact: true }).waitFor(visibleTimeout);
      await card
        .getByRole("status")
        .filter({ hasText: "Mercado Pago fue vinculado correctamente." })
        .waitFor(visibleTimeout);
      assert.strictEqual(await card.getByRole("button").count(), 0);
      return;
    }

    if (confirmation === "Cancelada y con opción de retry") {
      await card.getByText("Sin vincular", { exact: true }).waitFor(visibleTimeout);
      await card
        .getByRole("status")
        .filter({ hasText: "La vinculación de Mercado Pago fue cancelada." })
        .waitFor(visibleTimeout);
      assert.ok(
        await card
          .getByRole("button", { name: "Vincular Mercado Pago", exact: true })
          .isEnabled(),
      );
      return;
    }

    throw new Error(`Confirmación de Mercado Pago no soportada: ${confirmation}`);
  },
);

Then(
  "la tarjeta de Mercado Pago en mi perfil muestra {string}",
  async function (this: CustomWorld, expectedResult: string) {
    const card = this.page.getByRole("region", { name: "Mercado Pago" });

    if (expectedResult === "No visible") {
      assert.strictEqual(await card.count(), 0, "La tarjeta de Mercado Pago debería estar oculta.");
      return;
    }

    await card.waitFor(visibleTimeout);

    if (expectedResult === "Sin vincular y con opción para vincular") {
      assert.ok(await card.getByText("Sin vincular", { exact: true }).isVisible());
      assert.ok(await card.getByRole("button", { name: "Vincular Mercado Pago", exact: true }).isVisible());
      return;
    }

    if (expectedResult === "Vinculada y sin opción para vincular") {
      assert.ok(await card.getByText("Vinculada", { exact: true }).isVisible());
      assert.strictEqual(
        await card.getByRole("button").count(),
        0,
        "La tarjeta conectada no debería ofrecer una acción para volver a vincular.",
      );
      return;
    }

    throw new Error(`Resultado de tarjeta de Mercado Pago no soportado: ${expectedResult}`);
  },
);
