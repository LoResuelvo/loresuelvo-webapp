import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { page } from "./landing_page_visualization_steps";
import { ROUTES } from "../../lib/routes";
import { AuthSession } from "../../lib/auth/types";
import { MOCK_SESSION_COOKIE } from "../../lib/auth/mock-adapter";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

Given("que ingreso a la HomePage como prestador", async () => {
  const session: AuthSession = {
    user: {
      id: "provider-002",
      email: "prestador@loresuelvo.test",
      firstName: "Paula",
      lastName: "Rios",
      isOnboarded: true,
      role: "provider",
    },
    accessToken: "mock-access-token",
  };

  await page.context().addCookies([{
    name: MOCK_SESSION_COOKIE,
    value: encodeURIComponent(JSON.stringify(session)),
    domain: "localhost",
    path: "/",
  }]);

  await page.goto(APP_URL + ROUTES.provider.home);
});

When("se carga la pantalla principal", async () => {
  await page.waitForLoadState("networkidle");
});

Then("visualizo una barra lateral de navegación", async () => {
  const sidebar = page.getByRole("complementary", {
    name: "Panel lateral del prestador",
  });
  await sidebar.waitFor({ state: "visible" });
  assert.ok(await sidebar.isVisible(), "No se visualiza la barra lateral de navegación");
});

Then("veo la opción {string}", async (optionName: string) => {
  const option = page
    .getByRole("navigation", { name: "Navegación del prestador" })
    .getByRole("link", { name: optionName });
  await option.waitFor({ state: "visible" });
  assert.ok(await option.isVisible(), `No se visualiza la opción "${optionName}"`);
});

Then("visualizo la sección {string}", async (sectionName: string) => {
  const section = page.getByRole("region", { name: sectionName });
  await section.waitFor({ state: "visible" });
  assert.ok(await section.isVisible(), `No se visualiza la sección "${sectionName}"`);
});

Then("visualizo el mensaje {string}", async (message: string) => {
  const section = page.getByRole("region", { name: "Solicitudes de Trabajo" });
  await section.waitFor({ state: "visible" });
  const messageElement = section.getByText(message);
  await messageElement.waitFor({ state: "visible" });
  assert.ok(await messageElement.isVisible(), `No se visualiza el mensaje "${message}"`);
});

Then("visualizo una lista de solicitudes de trabajo", async () => {
  const list = page.getByRole("list", { name: "Lista de solicitudes de trabajo" });
  await list.waitFor({ state: "visible" });
  const requestsCount = await list.getByRole("listitem").count();
  assert.ok(requestsCount > 0, "No se visualiza ninguna solicitud de trabajo");
});

Then("cada solicitud muestra el nombre del cliente", async () => {
  await assertEveryWorkRequestHasField("client-name", "nombre del cliente");
});

Then("cada solicitud muestra el título del problema", async () => {
  await assertEveryWorkRequestHasField("problem-title", "título del problema");
});

Then("cada solicitud muestra una descripción resumida", async () => {
  await assertEveryWorkRequestHasField("summary", "descripción resumida");
});

Then("cada solicitud muestra la ubicación", async () => {
  await assertEveryWorkRequestHasField("location", "ubicación");
});

Then("cada solicitud muestra la fecha u hora de publicación", async () => {
  await assertEveryWorkRequestHasField("published-at", "fecha u hora de publicación");
});

Then("cada solicitud posee una acción {string}", async (actionName: string) => {
  const requests = page
    .getByRole("list", { name: "Lista de solicitudes de trabajo" })
    .getByRole("listitem");
  const requestsCount = await requests.count();

  assert.ok(requestsCount > 0, "No se visualiza ninguna solicitud de trabajo");

  for (let index = 0; index < requestsCount; index++) {
    const action = requests.nth(index).getByRole("button", { name: actionName });
    assert.ok(
      await action.isVisible(),
      `La solicitud ${index + 1} no posee la acción "${actionName}"`,
    );
  }
});

async function assertEveryWorkRequestHasField(field: string, fieldLabel: string) {
  const requests = page
    .getByRole("list", { name: "Lista de solicitudes de trabajo" })
    .getByRole("listitem");
  const requestsCount = await requests.count();

  assert.ok(requestsCount > 0, "No se visualiza ninguna solicitud de trabajo");

  for (let index = 0; index < requestsCount; index++) {
    const fieldValue = requests.nth(index).locator(`[data-field="${field}"]`);
    assert.ok(
      await fieldValue.isVisible(),
      `La solicitud ${index + 1} no muestra ${fieldLabel}`,
    );
  }
}

Given("que ingreso a la HomePage como prestador con solicitudes", async () => {
  const session: AuthSession = {
    user: {
      id: "provider-home-001",
      email: "prestador@loresuelvo.test",
      firstName: "Paula",
      lastName: "Rios",
      isOnboarded: true,
      role: "provider",
    },
    accessToken: "mock-access-token",
  };

  await page.context().addCookies([{
    name: MOCK_SESSION_COOKIE,
    value: encodeURIComponent(JSON.stringify(session)),
    domain: "localhost",
    path: "/",
  }]);

  await page.goto(APP_URL + ROUTES.provider.home);
});
