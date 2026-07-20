import { Given, When, Then } from "@cucumber/cucumber";
import { page } from "./landing_page_visualization_steps";
import { addApiStub } from "./stubs-helper";
import assert from "assert";
import { ROUTES } from "../../lib/routes";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const MOCK_SESSION_COOKIE = "loresuelvo_session";

When('finalizo el registro como prestador', async () => {
  // Mock external MercadoPago authorization page navigation
  await page.route('**/auth.mercadopago.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body>Mock MercadoPago Auth Page</body></html>'
    });
  });

  await addApiStub({
    method: "POST",
    endpoint: "/providers",
    status: 201,
    body: {
      id: "mock-provider-001",
      profile_photo_url: "http://localhost:3000/mock-s3-url/avatar.png"
    }
  });

  await addApiStub({
    method: "POST",
    endpoint: "/providers/me/payment-accounts/authorization",
    status: 201,
    body: {
      authorization_url: "https://auth.mercadopago.com/authorization?state=test-state",
      state: "test-state"
    }
  });

  await addApiStub({
    method: "GET",
    endpoint: "/providers/me/payment-accounts",
    status: 200,
    body: {
      status: "pending",
      can_receive_payments: false,
      can_send_service_proposals: false
    }
  });

  const button = page.getByRole('button', { name: 'Finalizar Registro' }).first();
  await button.waitFor({ state: "visible" });
  await button.click();
});

Then('veo la pantalla de conexión de Mercado Pago', async () => {
  const title = page.getByText("Conectá tu cuenta de Mercado Pago").first();
  await title.waitFor({ state: "visible" });
  assert.ok(await title.isVisible(), "No se muestra la pantalla de conexión de Mercado Pago");
});

Then('veo un botón {string}', async (buttonName: string) => {
  const button = page.getByRole('button', { name: buttonName })
                     .or(page.getByRole('link', { name: buttonName })).first();
  await button.waitFor({ state: "visible" });
  assert.ok(await button.isVisible(), `No se encontró el botón: "${buttonName}"`);
});

Given('que completé el registro y estoy en el paso de conexión de Mercado Pago', async () => {
  await page.route('**/auth.mercadopago.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body>Mock MercadoPago Auth Page</body></html>'
    });
  });

  await addApiStub({
    method: "POST",
    endpoint: "/providers",
    status: 201,
    body: {
      id: "mock-provider-001",
      profile_photo_url: "http://localhost:3000/mock-s3-url/avatar.png"
    }
  });

  await addApiStub({
    method: "POST",
    endpoint: "/providers/me/payment-accounts/authorization",
    status: 201,
    body: {
      authorization_url: "https://auth.mercadopago.com/authorization?state=test-state",
      state: "test-state"
    }
  });

  await addApiStub({
    method: "GET",
    endpoint: "/providers/me/payment-accounts",
    status: 200,
    body: {
      status: "pending",
      can_receive_payments: false,
      can_send_service_proposals: false
    }
  });

  const button = page.getByRole('button', { name: 'Finalizar Registro' }).first();
  await button.waitFor({ state: "visible" });
  await button.click();

  const title = page.getByText("Conectá tu cuenta de Mercado Pago").first();
  await title.waitFor({ state: "visible" });
});

Then('soy redirigido a la página de autorización de Mercado Pago', async () => {
  await page.waitForURL(url => url.toString().includes("mercadopago.com"));
  assert.ok(page.url().includes("mercadopago.com"), `No se redirigió a Mercado Pago. URL actual: ${page.url()}`);
});

When('llego a la página de resultado de conexión con resultado {string}', async (result: string) => {
  if (result === "success") {
    await addApiStub({
      method: "GET",
      endpoint: "/providers/me/payment-accounts",
      status: 200,
      body: {
        status: "connected",
        account_id: "mp-test",
        can_receive_payments: true,
        can_send_service_proposals: true
      }
    });
  } else {
    await addApiStub({
      method: "GET",
      endpoint: "/providers/me/payment-accounts",
      status: 200,
      body: {
        status: "pending",
        can_receive_payments: false,
        can_send_service_proposals: false
      }
    });
  }

  await addApiStub({
    method: "GET",
    endpoint: "/job-requests",
    status: 200,
    body: []
  });

  // Navigate to the callback route with parameter
  const callbackUrl = APP_URL + "/provider/register/mercado-pago" + `?result=${result}`;
  await page.goto(callbackUrl);
});

Given('que la conexión de Mercado Pago fue exitosa', async () => {
  await page.context().addCookies([{
    name: MOCK_SESSION_COOKIE,
    value: encodeURIComponent(JSON.stringify({
      user: { id: "mock-provider-001", email: "prestador@example.com", firstName: "Juan", lastName: "Pérez", isOnboarded: true },
      accessToken: "mock-access-token"
    })),
    domain: "localhost",
    path: "/",
  }]);

  await addApiStub({
    method: "GET",
    endpoint: "/providers/me/payment-accounts",
    status: 200,
    body: {
      status: "connected",
      account_id: "mp-test",
      can_receive_payments: true,
      can_send_service_proposals: true
    }
  });

  await addApiStub({
    method: "GET",
    endpoint: "/job-requests",
    status: 200,
    body: []
  });

  const callbackUrl = APP_URL + "/provider/register/mercado-pago" + "?result=success";
  await page.goto(callbackUrl);
});

When('hago clic en el botón {string} de la página de resultado', async (buttonName: string) => {
  const button = page.getByRole('button', { name: buttonName })
                     .or(page.getByRole('link', { name: buttonName })).first();
  await button.waitFor({ state: "visible" });
  await button.click();
});

Given('que la conexión de Mercado Pago fue cancelada', async () => {
  await page.context().addCookies([{
    name: MOCK_SESSION_COOKIE,
    value: encodeURIComponent(JSON.stringify({
      user: { id: "mock-provider-001", email: "prestador@example.com", firstName: "Juan", lastName: "Pérez", isOnboarded: true },
      accessToken: "mock-access-token"
    })),
    domain: "localhost",
    path: "/",
  }]);

  await addApiStub({
    method: "GET",
    endpoint: "/providers/me/payment-accounts",
    status: 200,
    body: {
      status: "pending",
      can_receive_payments: false,
      can_send_service_proposals: false
    }
  });

  await addApiStub({
    method: "GET",
    endpoint: "/job-requests",
    status: 200,
    body: []
  });

  const callbackUrl = APP_URL + "/provider/register/mercado-pago" + "?result=cancelled";
  await page.goto(callbackUrl);
});
