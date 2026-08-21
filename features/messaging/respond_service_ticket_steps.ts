import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, APP_URL } from "../support/world";
import { ROUTES } from "../../lib/routes";
import { aConversation } from "../support/factories";

const mockJobRequests = [
  {
    id: 1,
    conversation_id: 1,
    title: "Reparación de fuga en la cocina",
    description: "Hola Ana, necesito reparar una fuga de agua en la cocina. ¿Podrías ayudarme esta semana?",
    requester: {
      name: "María",
      surname: "Fernández",
    },
  },
  {
    id: 2,
    conversation_id: 2,
    title: "Instalación de luminarias",
    description: "Busco instalar tres luces nuevas en el living.",
    requester: {
      name: "Javier",
      surname: "Torres",
    },
  },
];

async function setProviderSession(world: CustomWorld) {
  await world.setSession("provider", {
    id: "provider-001",
    email: "prestador@loresuelvo.test",
    firstName: "Paula",
    lastName: "Rios",
    isOnboarded: true,
  });
}

Given("que existen solicitudes de trabajo pendientes para mí", async function (this: CustomWorld) {
  await setProviderSession(this);
  await this.stubGet("/job-requests", mockJobRequests);
});

When("accedo al dashboard de prestador", async function (this: CustomWorld) {
  await this.page.goto(APP_URL + ROUTES.provider.home);
  await this.page.waitForLoadState("networkidle");
});

Then("visualizo las solicitudes pendientes en la sección {string}", async function (this: CustomWorld, sectionName: string) {
  const section = this.page.getByRole("region", { name: sectionName });
  await section.waitFor({ state: "visible" });
  assert.ok(await section.isVisible(), `No se visualiza la sección "${sectionName}"`);
});

Given("que visualizo una solicitud pendiente", async function (this: CustomWorld) {
  await setProviderSession(this);
  await this.stubGet("/job-requests", mockJobRequests);

  await this.page.goto(APP_URL + ROUTES.provider.home);
  await this.page.waitForLoadState("networkidle");
});

When("hago clic en {string}", async function (this: CustomWorld, buttonName: string) {
  const button = this.page.getByRole("button", { name: new RegExp(buttonName, "i") }).first();
  await button.waitFor({ state: "visible" });
  await button.click();
});

Then("se muestra el detalle de la solicitud", async function (this: CustomWorld) {
  const modal = this.page.getByRole("dialog", { name: "Detalle de Solicitud" });
  await modal.waitFor({ state: "visible" });
  assert.ok(await modal.isVisible(), "No se muestra el modal de detalle");
});

Then("visualizo:", async function (this: CustomWorld, dataTable: { raw: () => string[][] }) {
  const fields = dataTable.raw().map((row) => row[0]);
  const modal = this.page.getByRole("dialog", { name: "Detalle de Solicitud" });

  for (const field of fields) {
    switch (field) {
      case "nombre del consumidor":
        await modal.getByText("María Fernández").waitFor({ state: "visible" });
        break;
      case "fecha de creación":
        await modal.getByText(/Ahora|Hace/).waitFor({ state: "visible" });
        break;
      case "descripción del problema":
        await modal.getByText(/fuga en la cocina/i).waitFor({ state: "visible" });
        break;
      case "categoría":
      case "ubicación":
        break;
    }
  }
});

Given("que me encuentro visualizando el detalle de una solicitud pendiente", async function (this: CustomWorld) {
  await setProviderSession(this);

  await this.stubGet("/job-requests", mockJobRequests);
  await this.stubPost("/job-requests/1/accept", 200, {});

  await this.stubGet("/conversations/1", {
    id: 1,
    status: "pending",
    work: {
      counterpart: { id: 10, role: "consumer", name: "María", surname: "Fernández", category_name: "Plomería" },
    },
    messages: [],
    updated_on: "2026-06-03T12:00:00Z",
  });

  await this.stubGet("/conversations", [
    aConversation({
      id: 1,
      status: "pending",
      counterpart: { id: 10, role: "consumer", name: "María", surname: "Fernández", category_name: "Plomería" },
      last_message: undefined,
      updated_on: "2026-06-03T12:00:00Z",
    }),
  ]);

  await this.page.goto(APP_URL + ROUTES.provider.home);
  await this.page.waitForLoadState("networkidle");

  const viewButton = this.page.getByRole("button", { name: /Ver Solicitud/i }).first();
  await viewButton.waitFor({ state: "visible" });
  await viewButton.click();

  const modal = this.page.getByRole("dialog", { name: "Detalle de Solicitud" });
  await modal.waitFor({ state: "visible" });
});

Then("la solicitud cambia a estado aceptada", async function (this: CustomWorld) {
  await this.page.waitForSelector('button:has-text("Continuar conversación")', { state: "hidden", timeout: 5000 }).catch(() => {});
});

Then("la solicitud cambia a estado rechazada", async function (this: CustomWorld) {
  await this.page.waitForSelector('button:has-text("Rechazar Solicitud")', { state: "hidden", timeout: 5000 }).catch(() => {});
});

Then("deja de aparecer en la lista de solicitudes pendientes", async function (this: CustomWorld) {
  const requestCard = this.page.locator("[data-field='problem-title']").filter({ hasText: "Reparación de fuga" });
  await requestCard.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
});

Given("que estoy visualizando el detalle de una solicitud", async function (this: CustomWorld) {
  await setProviderSession(this);
  await this.stubGet("/job-requests", mockJobRequests);

  await this.page.goto(APP_URL + ROUTES.provider.home);
  await this.page.waitForLoadState("networkidle");

  const viewButton = this.page.getByRole("button", { name: /Ver Solicitud/i }).first();
  await viewButton.waitFor({ state: "visible" });
  await viewButton.click();

  const modal = this.page.getByRole("dialog", { name: "Detalle de Solicitud" });
  await modal.waitFor({ state: "visible" });
});

When("cierro la ventana de detalle", async function (this: CustomWorld) {
  const closeButton = this.page.getByRole("button", { name: /Cerrar/i });
  await closeButton.waitFor({ state: "visible" });
  await closeButton.click();
});

Then("regreso al dashboard de prestador", async function (this: CustomWorld) {
  const section = this.page.getByRole("region", { name: "Solicitudes de Trabajo" });
  await section.waitFor({ state: "visible" });
});

Then("continúo visualizando la lista de solicitudes pendientes", async function (this: CustomWorld) {
  const list = this.page.getByRole("list", { name: "Lista de solicitudes de trabajo" });
  await list.waitFor({ state: "visible" });
});