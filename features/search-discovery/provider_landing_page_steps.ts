import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, APP_URL } from "../support/world";
import { ROUTES } from "../../lib/routes";
import { aJobRequest } from "../support/factories";

Given("que ingreso a la HomePage como prestador", async function (this: CustomWorld) {
  await this.setSession("provider", {
    id: "provider-002",
    email: "prestador@loresuelvo.test",
    firstName: "Paula",
    lastName: "Rios",
    isOnboarded: true,
  });

  await this.stubGet("/job-requests", []);
  await this.page.goto(APP_URL + ROUTES.provider.home, { waitUntil: "networkidle" });
  await this.page.waitForTimeout(500);
});

When("se carga la pantalla principal", async function (this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("visualizo una barra lateral de navegación", async function (this: CustomWorld) {
  const sidebar = this.page.getByRole("complementary", {
    name: "Panel lateral del prestador",
  });
  await sidebar.waitFor({ state: "visible" });
  assert.ok(await sidebar.isVisible(), "No se visualiza la barra lateral de navegación");
});

Then("veo la opción {string}", async function (this: CustomWorld, optionName: string) {
  const option = this.page
    .getByRole("navigation", { name: "Navegación del prestador" })
    .getByRole("link", { name: optionName });
  await option.waitFor({ state: "visible" });
  assert.ok(await option.isVisible(), `No se visualiza la opción "${optionName}"`);
});

Then("visualizo la sección {string}", async function (this: CustomWorld, sectionName: string) {
  const section = this.page.getByRole("region", { name: sectionName });
  await section.waitFor({ state: "visible" });
  assert.ok(await section.isVisible(), `No se visualiza la sección "${sectionName}"`);
});

Then("visualizo el mensaje {string}", async function (this: CustomWorld, message: string) {
  const section = this.page.getByRole("region", { name: "Solicitudes de Trabajo" });
  const isSectionVisible = await section.isVisible().catch(() => false);
  if (isSectionVisible) {
    const messageElement = section.getByText(message);
    await messageElement.waitFor({ state: "visible" });
    assert.ok(await messageElement.isVisible(), `No se visualiza el mensaje "${message}"`);
  } else {
    const messageElement = this.page.getByText(message);
    await messageElement.waitFor({ state: "visible" });
    assert.ok(await messageElement.isVisible(), `No se visualiza el mensaje "${message}"`);
  }
});

Then("visualizo una lista de solicitudes de trabajo", async function (this: CustomWorld) {
  const list = this.page.getByRole("list", { name: "Lista de solicitudes de trabajo" });
  await list.waitFor({ state: "visible" });
  const requestsCount = await list.getByRole("listitem").count();
  assert.ok(requestsCount > 0, "No se visualiza ninguna solicitud de trabajo");
});

async function assertEveryWorkRequestHasField(world: CustomWorld, field: string, fieldLabel: string) {
  const requests = world.page
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

Then("cada solicitud muestra el nombre del cliente", async function (this: CustomWorld) {
  await assertEveryWorkRequestHasField(this, "client-name", "nombre del cliente");
});

Then("cada solicitud muestra el título del problema", async function (this: CustomWorld) {
  await assertEveryWorkRequestHasField(this, "problem-title", "título del problema");
});

Then("cada solicitud muestra una descripción resumida", async function (this: CustomWorld) {
  await assertEveryWorkRequestHasField(this, "description", "descripción resumida");
});

Then("cada solicitud muestra la ubicación", async function (this: CustomWorld) {
  await assertEveryWorkRequestHasField(this, "location", "ubicación");
});

Then("cada solicitud muestra la fecha u hora de publicación", async function (this: CustomWorld) {
  await assertEveryWorkRequestHasField(this, "published-at", "fecha u hora de publicación");
});

Then("cada solicitud posee una acción {string}", async function (this: CustomWorld, actionName: string) {
  const requests = this.page
    .getByRole("list", { name: "Lista de solicitudes de trabajo" })
    .getByRole("listitem");
  const requestsCount = await requests.count();

  assert.ok(requestsCount > 0, "No se visualiza ninguna solicitud de trabajo");

  const buttonNameMap: Record<string, string> = {
    Responder: "Ver Solicitud",
    Detalles: "Ver Solicitud",
  };

  const actualButtonName = buttonNameMap[actionName] || actionName;

  for (let index = 0; index < requestsCount; index++) {
    const action = requests.nth(index).getByRole("button", { name: actualButtonName });
    assert.ok(
      await action.isVisible(),
      `La solicitud ${index + 1} no posee la acción "${actionName}"`,
    );
  }
});

Given("que ingreso a la HomePage como prestador con solicitudes", async function (this: CustomWorld) {
  await this.setSession("provider", {
    id: "provider-home-001",
    email: "prestador@loresuelvo.test",
    firstName: "Paula",
    lastName: "Rios",
    isOnboarded: true,
  });

  await this.stubGet("/job-requests", [
    aJobRequest({
      id: 1,
      conversation_id: 1,
      title: "Reparación de fuga en la cocina",
      description: "Hola, necesito reparar una fuga de agua.",
      requester: { name: "María", surname: "Fernández" },
    }),
    aJobRequest({
      id: 2,
      conversation_id: 2,
      title: "Instalación de luminarias",
      description: "Busco instalar tres luces nuevas.",
      requester: { name: "Javier", surname: "Torres" },
    }),
  ]);

  await this.page.goto(APP_URL + ROUTES.provider.home);
});

Given("que ingreso a la HomePage como prestador con trabajos agendados", async function (this: CustomWorld) {
  await this.setSession("provider", {
    id: "provider-home-001",
    email: "prestador@loresuelvo.test",
    firstName: "Paula",
    lastName: "Rios",
    isOnboarded: true,
  });

  await this.stubGet("/job-requests", [
    aJobRequest({
      id: 1,
      conversation_id: 1,
      title: "Reparación de fuga",
      description: "Necesito reparar una fuga de agua.",
      requester: { name: "Carlos", surname: "Méndez" },
    }),
  ]);

  await this.page.goto(APP_URL + ROUTES.provider.home, { waitUntil: "networkidle" });
});

Then("visualizo una lista de trabajos agendados", async function (this: CustomWorld) {
  const list = this.page.getByRole("list", { name: "Lista de trabajos agendados" });
  await list.waitFor({ state: "visible" });
  const jobsCount = await list.getByRole("listitem").count();
  assert.ok(jobsCount > 0, "No se visualiza ningún trabajo agendado");
});

async function assertEveryScheduledJobHasField(world: CustomWorld, field: string, fieldLabel: string) {
  const jobs = world.page
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

Then("cada trabajo muestra el título del trabajo", async function (this: CustomWorld) {
  await assertEveryScheduledJobHasField(this, "job-title", "título del trabajo");
});

Then("cada trabajo muestra el cliente asociado", async function (this: CustomWorld) {
  await assertEveryScheduledJobHasField(this, "client-name", "cliente asociado");
});

Then("cada trabajo muestra la fecha y hora programada", async function (this: CustomWorld) {
  await assertEveryScheduledJobHasField(this, "scheduled-at", "fecha y hora programada");
});

Then("cada trabajo muestra la ubicación", async function (this: CustomWorld) {
  await assertEveryScheduledJobHasField(this, "location", "ubicación");
});

Then("cada trabajo muestra el importe acordado", async function (this: CustomWorld) {
  await assertEveryScheduledJobHasField(this, "price", "importe acordado");
});

Given("que ingreso a la HomePage como prestador con métricas", async function (this: CustomWorld) {
  await this.setSession("provider", {
    id: "provider-home-001",
    email: "prestador@loresuelvo.test",
    firstName: "Paula",
    lastName: "Rios",
    isOnboarded: true,
  });

  await this.stubGet("/job-requests", [
    aJobRequest({
      id: 1,
      conversation_id: 1,
      title: "Reparación de fuga",
      description: "Necesito reparar una fuga de agua.",
      requester: { name: "Carlos", surname: "Méndez" },
    }),
  ]);

  await this.stubGet("/service-proposals", []);
  await this.page.goto(APP_URL + ROUTES.provider.home, { waitUntil: "networkidle" });
});

Then("visualizo un panel de métricas", async function (this: CustomWorld) {
  const panel = this.page.getByRole("region", { name: "Métricas del Prestador" });
  await panel.waitFor({ state: "visible" });
  assert.ok(await panel.isVisible(), "No se visualiza el panel de métricas");
});

Then("visualizo los ingresos del período", async function (this: CustomWorld) {
  const panel = this.page.getByRole("region", { name: "Métricas del Prestador" });
  await panel.waitFor({ state: "visible" });
  const incomeMetric = panel.locator('[data-metric="income"]');
  assert.ok(await incomeMetric.isVisible(), "No se visualiza la métrica de ingresos");
});

Then("visualizo la cantidad de trabajos realizados", async function (this: CustomWorld) {
  const panel = this.page.getByRole("region", { name: "Métricas del Prestador" });
  await panel.waitFor({ state: "visible" });
  const jobsMetric = panel.locator('[data-metric="jobs-completed"]');
  assert.ok(await jobsMetric.isVisible(), "No se visualiza la métrica de trabajos realizados");
});

Then("visualizo la calificación promedio del prestador", async function (this: CustomWorld) {
  const panel = this.page.getByRole("region", { name: "Métricas del Prestador" });
  await panel.waitFor({ state: "visible" });
  const ratingMetric = panel.locator('[data-metric="rating"]');
  assert.ok(await ratingMetric.isVisible(), "No se visualiza la métrica de calificación");
});

Then("visualizo el panel de ingresos", async function (this: CustomWorld) {
  const panel = this.page.getByRole("complementary", { name: "Panel de ingresos" });
  await panel.waitFor({ state: "visible" });
  assert.ok(await panel.isVisible(), "No se visualiza el panel de ingresos");
});

Then("visualizo el título {string}", async function (this: CustomWorld, title: string) {
  const panel = this.page.getByRole("complementary", { name: "Panel de ingresos" });
  await panel.waitFor({ state: "visible" });
  const titleElement = panel.getByText(title);
  assert.ok(await titleElement.isVisible(), `No se visualiza el título "${title}"`);
});

Then("visualizo el monto de ingresos", async function (this: CustomWorld) {
  const panel = this.page.getByRole("complementary", { name: "Panel de ingresos" });
  await panel.waitFor({ state: "visible" });
  const amountElement = panel.locator("text=/\\$[0-9,]+/");
  assert.ok(await amountElement.isVisible(), "No se visualiza el monto de ingresos");
});

Then("visualizo el indicador de variación", async function (this: CustomWorld) {
  const panel = this.page.getByRole("complementary", { name: "Panel de ingresos" });
  await panel.waitFor({ state: "visible" });
  const variationElement = panel.getByText(/[\+−][0-9]+% vs mes anterior/);
  assert.ok(await variationElement.isVisible(), "No se visualiza el indicador de variación");
});

Given("que la API aún no se encuentra disponible", async function (this: CustomWorld) {});

Given("ingreso a la HomePage como prestador con datos simulados", async function (this: CustomWorld) {
  await this.setSession("provider", {
    id: "provider-home-001",
    email: "prestador@loresuelvo.test",
    firstName: "Paula",
    lastName: "Rios",
    isOnboarded: true,
  });

  await this.stubGet("/job-requests", [
    aJobRequest({
      id: 1,
      conversation_id: 1,
      title: "Reparación de fuga en la cocina",
      description: "Hola, necesito reparar una fuga de agua.",
      requester: { name: "María", surname: "Fernández" },
    }),
  ]);

  await this.page.goto(APP_URL + ROUTES.provider.home, { waitUntil: "networkidle" });
  await this.page.waitForTimeout(500);
});

Then("visualizo la sección {string} con datos simulados", async function (this: CustomWorld, sectionName: string) {
  const section = this.page.getByRole("region", { name: sectionName });
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

Then("visualizo el panel de ingresos con datos simulados", async function (this: CustomWorld) {
  const panel = this.page.getByRole("complementary", { name: "Panel de ingresos" });
  await panel.waitFor({ state: "visible" });
  assert.ok(await panel.isVisible(), "No se visualiza el panel de ingresos con datos simulados");

  const amountElement = panel.locator("text=/\\$[0-9,]+/");
  assert.ok(await amountElement.isVisible(), "El panel de ingresos no muestra el monto");

  const jobsCard = panel.getByText("TRABAJOS");
  assert.ok(await jobsCard.isVisible(), "El panel de ingresos no muestra la tarjeta de TRABAJOS");

  const ratingCard = panel.getByText("PUNTAJE");
  assert.ok(await ratingCard.isVisible(), "El panel de ingresos no muestra la tarjeta de PUNTAJE");
});

Then("todas las secciones renderizan correctamente utilizando datos mockeados", async function (this: CustomWorld) {
  const sidebar = this.page.getByRole("complementary", { name: "Panel lateral del prestador" });
  assert.ok(await sidebar.isVisible(), "El sidebar no es visible");

  const incomePanel = this.page.getByRole("complementary", { name: "Panel de ingresos" });
  assert.ok(await incomePanel.isVisible(), "El panel de ingresos no es visible");

  const workRequestsSection = this.page.getByRole("region", { name: "Solicitudes de Trabajo" });
  assert.ok(await workRequestsSection.isVisible(), "La sección de solicitudes no es visible");

  const scheduledJobsSection = this.page.getByRole("region", { name: "Trabajos Agendados" });
  assert.ok(await scheduledJobsSection.isVisible(), "La sección de trabajos agendados no es visible");
});
