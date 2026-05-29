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

Given("que ingreso a la HomePage como prestador con trabajos agendados", async () => {
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

Then("visualizo una lista de trabajos agendados", async () => {
  const list = page.getByRole("list", { name: "Lista de trabajos agendados" });
  await list.waitFor({ state: "visible" });
  const jobsCount = await list.getByRole("listitem").count();
  assert.ok(jobsCount > 0, "No se visualiza ningún trabajo agendado");
});

Then("cada trabajo muestra el título del trabajo", async () => {
  await assertEveryScheduledJobHasField("job-title", "título del trabajo");
});

Then("cada trabajo muestra el cliente asociado", async () => {
  await assertEveryScheduledJobHasField("client-name", "cliente asociado");
});

Then("cada trabajo muestra la fecha y hora programada", async () => {
  await assertEveryScheduledJobHasField("scheduled-at", "fecha y hora programada");
});

Then("cada trabajo muestra la ubicación", async () => {
  await assertEveryScheduledJobHasField("location", "ubicación");
});

Then("cada trabajo muestra el importe acordado", async () => {
  await assertEveryScheduledJobHasField("price", "importe acordado");
});

async function assertEveryScheduledJobHasField(field: string, fieldLabel: string) {
  const jobs = page
    .getByRole("list", { name: "Lista de trabajos agendados" })
    .getByRole("listitem");
  const jobsCount = await jobs.count();

  assert.ok(jobsCount > 0, "No se visualiza ningún trabajo agendado");

  for (let index = 0; index < jobsCount; index++) {
    const fieldValue = jobs.nth(index).locator(`[data-field="${field}"]`);
    assert.ok(
      await fieldValue.isVisible(),
      `El trabajo ${index + 1} no muestra ${fieldLabel}`,
    );
  }
}

Given("que ingreso a la HomePage como prestador con métricas", async () => {
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

Then("visualizo un panel de métricas", async () => {
  const panel = page.getByRole("region", { name: "Métricas del Prestador" });
  await panel.waitFor({ state: "visible" });
  assert.ok(await panel.isVisible(), "No se visualiza el panel de métricas");
});

Then("visualizo los ingresos del período", async () => {
  const panel = page.getByRole("region", { name: "Métricas del Prestador" });
  await panel.waitFor({ state: "visible" });
  const incomeMetric = panel.locator('[data-metric="income"]');
  assert.ok(await incomeMetric.isVisible(), "No se visualiza la métrica de ingresos");
});

Then("visualizo la cantidad de trabajos realizados", async () => {
  const panel = page.getByRole("region", { name: "Métricas del Prestador" });
  await panel.waitFor({ state: "visible" });
  const jobsMetric = panel.locator('[data-metric="jobs-completed"]');
  assert.ok(await jobsMetric.isVisible(), "No se visualiza la métrica de trabajos realizados");
});

Then("visualizo la calificación promedio del prestador", async () => {
  const panel = page.getByRole("region", { name: "Métricas del Prestador" });
  await panel.waitFor({ state: "visible" });
  const ratingMetric = panel.locator('[data-metric="rating"]');
  assert.ok(await ratingMetric.isVisible(), "No se visualiza la métrica de calificación");
});

Then("visualizo el panel de ingresos", async () => {
  const panel = page.getByRole("complementary", { name: "Panel de ingresos" });
  await panel.waitFor({ state: "visible" });
  assert.ok(await panel.isVisible(), "No se visualiza el panel de ingresos");
});

Then("visualizo el título {string}", async (title: string) => {
  const panel = page.getByRole("complementary", { name: "Panel de ingresos" });
  await panel.waitFor({ state: "visible" });
  const titleElement = panel.getByText(title);
  assert.ok(await titleElement.isVisible(), `No se visualiza el título "${title}"`);
});

Then("visualizo el monto de ingresos", async () => {
  const panel = page.getByRole("complementary", { name: "Panel de ingresos" });
  await panel.waitFor({ state: "visible" });
  const amountElement = panel.locator("text=/\\$[0-9,]+/");
  assert.ok(await amountElement.isVisible(), "No se visualiza el monto de ingresos");
});

Then("visualizo el indicador de variación", async () => {
  const panel = page.getByRole("complementary", { name: "Panel de ingresos" });
  await panel.waitFor({ state: "visible" });
  const variationElement = panel.getByText(/[\+−][0-9]+% vs mes anterior/);
  assert.ok(await variationElement.isVisible(), "No se visualiza el indicador de variación");
});

Given("que la API aún no se encuentra disponible", async () => {
});

Given("ingreso a la HomePage como prestador con datos simulados", async () => {
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

Then("visualizo la sección {string} con datos simulados", async (sectionName: string) => {
  const section = page.getByRole("region", { name: sectionName });
  await section.waitFor({ state: "visible" });
  assert.ok(await section.isVisible(), `No se visualiza la sección "${sectionName}" con datos simulados`);
  
  if (sectionName === "Solicitudes de Trabajo") {
    const list = section.getByRole("list", { name: "Lista de solicitudes de trabajo" });
    await list.waitFor({ state: "visible" });
    const itemsCount = await list.getByRole("listitem").count();
    assert.ok(itemsCount > 0, "La lista de solicitudes está vacía");
  }
  
  if (sectionName === "Trabajos Agendados") {
    const list = section.getByRole("list", { name: "Lista de trabajos agendados" });
    await list.waitFor({ state: "visible" });
    const itemsCount = await list.getByRole("listitem").count();
    assert.ok(itemsCount > 0, "La lista de trabajos agendados está vacía");
  }
});

Then("visualizo el panel de ingresos con datos simulados", async () => {
  const panel = page.getByRole("complementary", { name: "Panel de ingresos" });
  await panel.waitFor({ state: "visible" });
  assert.ok(await panel.isVisible(), "No se visualiza el panel de ingresos con datos simulados");
  
  const amountElement = panel.locator("text=/\\$[0-9,]+/");
  assert.ok(await amountElement.isVisible(), "El panel de ingresos no muestra el monto");
  
  const jobsCard = panel.getByText("TRABAJOS");
  assert.ok(await jobsCard.isVisible(), "El panel de ingresos no muestra la tarjeta de TRABAJOS");
  
  const ratingCard = panel.getByText("PUNTAJE");
  assert.ok(await ratingCard.isVisible(), "El panel de ingresos no muestra la tarjeta de PUNTAJE");
});

Then("todas las secciones renderizan correctamente utilizando datos mockeados", async () => {
  const sidebar = page.getByRole("complementary", { name: "Panel lateral del prestador" });
  assert.ok(await sidebar.isVisible(), "El sidebar no es visible");
  
  const incomePanel = page.getByRole("complementary", { name: "Panel de ingresos" });
  assert.ok(await incomePanel.isVisible(), "El panel de ingresos no es visible");
  
  const workRequestsSection = page.getByRole("region", { name: "Solicitudes de Trabajo" });
  assert.ok(await workRequestsSection.isVisible(), "La sección de solicitudes no es visible");
  
  const scheduledJobsSection = page.getByRole("region", { name: "Trabajos Agendados" });
  assert.ok(await scheduledJobsSection.isVisible(), "La sección de trabajos agendados no es visible");
});
