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
    await this.stubPost(
      "/providers/me/payment-accounts/authorization",
      201,
      aPaymentAuthorization(),
    );
    await this.page.route("**/auth.mercadopago.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Mock Mercado Pago Auth Page</body></html>",
      });
    });

    await this.page.goto(`${APP_URL}${ROUTES.provider.profile}`, {
      waitUntil: "domcontentloaded",
    });
    const connectButton = this.page
      .getByRole("region", { name: "Mercado Pago" })
      .getByRole("button", { name: "Vincular Mercado Pago", exact: true });
    await connectButton.waitFor(visibleTimeout);
  },
);

When(
  "selecciono vincular Mercado Pago desde Mi perfil",
  async function (this: CustomWorld) {
    await this.page
      .getByRole("region", { name: "Mercado Pago" })
      .getByRole("button", { name: "Vincular Mercado Pago", exact: true })
      .click();
  },
);

Then(
  "soy dirigido a la autorización existente de Mercado Pago",
  async function (this: CustomWorld) {
    await this.page.waitForURL(
      (url) => url.hostname === "auth.mercadopago.com",
      visibleTimeout,
    );
    assert.ok(
      this.page.url().includes("/authorization?state=test-state"),
      `No se usó la URL de autorización existente. URL actual: ${this.page.url()}`,
    );
    await this.page.getByText("Mock Mercado Pago Auth Page").waitFor(visibleTimeout);
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
