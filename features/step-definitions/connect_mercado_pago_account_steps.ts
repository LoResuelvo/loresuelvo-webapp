import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld, APP_URL } from "../support/world";
import assert from "assert";
import { MOCK_SESSION_COOKIE } from "../../infrastructure/auth/mock-adapter";


When("finalizo el registro como prestador", async function (this: CustomWorld) {
  // Mock external MercadoPago authorization page navigation
  await this.page.route("**/auth.mercadopago.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body>Mock MercadoPago Auth Page</body></html>",
    });
  });

  await this.addApiStub({
    method: "POST",
    endpoint: "/providers",
    status: 201,
    body: {
      id: "mock-provider-001",
      profile_photo_url: "http://localhost:3001/mock-s3-url/avatar.png",
    },
  });

  await this.addApiStub({
    method: "POST",
    endpoint: "/providers/me/payment-accounts/authorization",
    status: 201,
    body: {
      authorization_url: "https://auth.mercadopago.com/authorization?state=test-state",
      state: "test-state",
    },
  });

  await this.addApiStub({
    method: "GET",
    endpoint: "/providers/me/payment-accounts",
    status: 200,
    body: {
      status: "pending",
      can_receive_payments: false,
      can_send_service_proposals: false,
    },
  });

  const button = this.page.getByRole("button", { name: "Finalizar Registro" }).first();
  await button.waitFor({ state: "visible" });
  await button.click();
});

Then("veo la pantalla de conexión de Mercado Pago", async function (this: CustomWorld) {
  const title = this.page.getByText("Conectá tu cuenta de Mercado Pago").first();
  await title.waitFor({ state: "visible" });
  assert.ok(await title.isVisible(), "No se muestra la pantalla de conexión de Mercado Pago");
});

Then("veo un botón {string}", async function (this: CustomWorld, buttonName: string) {
  const button = this.page
    .getByRole("button", { name: buttonName })
    .or(this.page.getByRole("link", { name: buttonName }))
    .first();
  await button.waitFor({ state: "visible" });
  assert.ok(await button.isVisible(), `No se encontró el botón: "${buttonName}"`);
});

Given(
  "que completé el registro y estoy en el paso de conexión de Mercado Pago",
  async function (this: CustomWorld) {
    await this.page.route("**/auth.mercadopago.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Mock MercadoPago Auth Page</body></html>",
      });
    });

    await this.addApiStub({
      method: "POST",
      endpoint: "/providers",
      status: 201,
      body: {
        id: "mock-provider-001",
        profile_photo_url: "http://localhost:3001/mock-s3-url/avatar.png",
      },
    });

    await this.addApiStub({
      method: "POST",
      endpoint: "/providers/me/payment-accounts/authorization",
      status: 201,
      body: {
        authorization_url: "https://auth.mercadopago.com/authorization?state=test-state",
        state: "test-state",
      },
    });

    await this.addApiStub({
      method: "GET",
      endpoint: "/providers/me/payment-accounts",
      status: 200,
      body: {
        status: "pending",
        can_receive_payments: false,
        can_send_service_proposals: false,
      },
    });

    const button = this.page.getByRole("button", { name: "Finalizar Registro" }).first();
    await button.waitFor({ state: "visible" });
    await button.click();

    const title = this.page.getByText("Conectá tu cuenta de Mercado Pago").first();
    await title.waitFor({ state: "visible" });
  }
);

Then("soy redirigido a la página de autorización de Mercado Pago", async function (this: CustomWorld) {
  await this.page.waitForURL((url) => url.toString().includes("mercadopago.com"));
  assert.ok(
    this.page.url().includes("mercadopago.com"),
    `No se redirigió a Mercado Pago. URL actual: ${this.page.url()}`
  );
});

When(
  "llego a la página de resultado de conexión con resultado {string}",
  async function (this: CustomWorld, result: string) {
    if (result === "success") {
      await this.addApiStub({
        method: "GET",
        endpoint: "/providers/me/payment-accounts",
        status: 200,
        body: {
          status: "connected",
          account_id: "mp-test",
          can_receive_payments: true,
          can_send_service_proposals: true,
        },
      });
    } else {
      await this.addApiStub({
        method: "GET",
        endpoint: "/providers/me/payment-accounts",
        status: 200,
        body: {
          status: "pending",
          can_receive_payments: false,
          can_send_service_proposals: false,
        },
      });
    }

    await this.addApiStub({
      method: "GET",
      endpoint: "/job-requests",
      status: 200,
      body: [],
    });

    const callbackUrl = APP_URL + "/provider/register/mercado-pago" + `?result=${result}`;
    await this.page.goto(callbackUrl);
  }
);

Given("que la conexión de Mercado Pago fue exitosa", async function (this: CustomWorld) {
  await this.page.context().addCookies([
    {
      name: MOCK_SESSION_COOKIE,
      value: encodeURIComponent(
        JSON.stringify({
          user: {
            id: "mock-provider-001",
            email: "prestador@example.com",
            firstName: "Juan",
            lastName: "Pérez",
            isOnboarded: true,
            role: "provider",
          },
          accessToken: "mock-access-token",
        })
      ),
      domain: "localhost",
      path: "/",
    },
  ]);

  await this.addApiStub({
    method: "GET",
    endpoint: "/providers/me/payment-accounts",
    status: 200,
    body: {
      status: "connected",
      account_id: "mp-test",
      can_receive_payments: true,
      can_send_service_proposals: true,
    },
  });

  await this.addApiStub({
    method: "GET",
    endpoint: "/job-requests",
    status: 200,
    body: [],
  });

  const callbackUrl = APP_URL + "/provider/register/mercado-pago" + "?result=success";
  await this.page.goto(callbackUrl);
});

When(
  "hago clic en el botón {string} de la página de resultado",
  async function (this: CustomWorld, buttonName: string) {
    const button = this.page
      .getByRole("button", { name: buttonName })
      .or(this.page.getByRole("link", { name: buttonName }))
      .first();
    await button.waitFor({ state: "visible" });
    await button.click();
  }
);

Given("que la conexión de Mercado Pago fue cancelada", async function (this: CustomWorld) {
  await this.page.context().addCookies([
    {
      name: MOCK_SESSION_COOKIE,
      value: encodeURIComponent(
        JSON.stringify({
          user: {
            id: "mock-provider-001",
            email: "prestador@example.com",
            firstName: "Juan",
            lastName: "Pérez",
            isOnboarded: false,
            role: "provider",
          },
          accessToken: "mock-access-token",
        })
      ),
      domain: "localhost",
      path: "/",
    },
  ]);

  await this.addApiStub({
    method: "GET",
    endpoint: "/providers/me/payment-accounts",
    status: 200,
    body: {
      status: "pending",
      can_receive_payments: false,
      can_send_service_proposals: false,
    },
  });

  await this.addApiStub({
    method: "GET",
    endpoint: "/job-requests",
    status: 200,
    body: [],
  });

  const callbackUrl = APP_URL + "/provider/register/mercado-pago" + "?result=cancelled";
  await this.page.goto(callbackUrl);
});
