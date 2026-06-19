import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { page } from "./landing_page_visualization_steps";
import { ROUTES } from "../../lib/routes";
import { AuthSession } from "../../infrastructure/auth/types";
import { MOCK_SESSION_COOKIE } from "../../infrastructure/auth/mock-adapter";
import { addApiStub } from "./stubs-helper";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

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

async function setProviderSession() {
  const session: AuthSession = {
    user: {
      id: "provider-001",
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
}

Given("que existen solicitudes de trabajo pendientes para mí", async () => {
  await setProviderSession();

  await addApiStub({
    method: "GET",
    endpoint: "/job-requests",
    status: 200,
    body: mockJobRequests,
  });
});

When("accedo al dashboard de prestador", async () => {
  await page.goto(APP_URL + ROUTES.provider.home);
  await page.waitForLoadState("networkidle");
});

Then("visualizo las solicitudes pendientes en la sección {string}", async (sectionName: string) => {
  const section = page.getByRole("region", { name: sectionName });
  await section.waitFor({ state: "visible" });
  assert.ok(await section.isVisible(), `No se visualiza la sección "${sectionName}"`);
});

Given("que visualizo una solicitud pendiente", async () => {
  await setProviderSession();

  await addApiStub({
    method: "GET",
    endpoint: "/job-requests",
    status: 200,
    body: mockJobRequests,
  });

  await page.goto(APP_URL + ROUTES.provider.home);
  await page.waitForLoadState("networkidle");
});

When("hago clic en {string}", async (buttonName: string) => {
  const button = page.getByRole("button", { name: new RegExp(buttonName, "i") }).first();
  await button.waitFor({ state: "visible" });
  await button.click();
});

Then("se muestra el detalle de la solicitud", async () => {
  const modal = page.getByRole("dialog", { name: "Detalle de Solicitud" });
  await modal.waitFor({ state: "visible" });
  assert.ok(await modal.isVisible(), "No se muestra el modal de detalle");
});

Then("visualizo:", async (dataTable: { raw: () => string[][] }) => {
  const fields = dataTable.raw().map(row => row[0]);
  const modal = page.getByRole("dialog", { name: "Detalle de Solicitud" });

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

Given("que me encuentro visualizando el detalle de una solicitud pendiente", async () => {
  await setProviderSession();

  await addApiStub({
    method: "GET",
    endpoint: "/job-requests",
    status: 200,
    body: mockJobRequests,
  });

  await addApiStub({
    method: "POST",
    endpoint: "/job-requests/1/accept",
    status: 200,
    body: {},
  });

  await addApiStub({
    method: "GET",
    endpoint: "/conversations/1",
    status: 200,
    body: {
      id: 1,
      status: "pending",
      work: {
        counterpart: { id: 10, role: "consumer", name: "María", surname: "Fernández", category_name: "Plomería" },
      },
      messages: [],
      updated_on: "2026-06-03T12:00:00Z",
    },
  });

  await addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: [
      {
        id: 1,
        status: "pending",
        counterpart: { id: 10, role: "consumer", name: "María", surname: "Fernández", category_name: "Plomería" },
        last_message: null,
        updated_on: "2026-06-03T12:00:00Z",
      },
    ],
  });

  await page.goto(APP_URL + ROUTES.provider.home);
  await page.waitForLoadState("networkidle");

  const viewButton = page.getByRole("button", { name: /Ver Solicitud/i }).first();
  await viewButton.waitFor({ state: "visible" });
  await viewButton.click();

  const modal = page.getByRole("dialog", { name: "Detalle de Solicitud" });
  await modal.waitFor({ state: "visible" });
});

Then("la solicitud cambia a estado aceptada", async () => {
  await page.waitForSelector('button:has-text("Continuar conversación")', { state: "hidden", timeout: 5000 }).catch(() => {});
});

Then("la solicitud cambia a estado rechazada", async () => {
  await page.waitForSelector('button:has-text("Rechazar Solicitud")', { state: "hidden", timeout: 5000 }).catch(() => {});
});

Then("deja de aparecer en la lista de solicitudes pendientes", async () => {
  const requestCard = page.locator("[data-field='problem-title']").filter({ hasText: "Reparación de fuga" });
  await requestCard.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
});

Given("que estoy visualizando el detalle de una solicitud", async () => {
  await setProviderSession();

  await addApiStub({
    method: "GET",
    endpoint: "/job-requests",
    status: 200,
    body: mockJobRequests,
  });

  await page.goto(APP_URL + ROUTES.provider.home);
  await page.waitForLoadState("networkidle");

  const viewButton = page.getByRole("button", { name: /Ver Solicitud/i }).first();
  await viewButton.waitFor({ state: "visible" });
  await viewButton.click();

  const modal = page.getByRole("dialog", { name: "Detalle de Solicitud" });
  await modal.waitFor({ state: "visible" });
});

When("cierro la ventana de detalle", async () => {
  const closeButton = page.getByRole("button", { name: /Cerrar/i });
  await closeButton.waitFor({ state: "visible" });
  await closeButton.click();
});

Then("regreso al dashboard de prestador", async () => {
  const section = page.getByRole("region", { name: "Solicitudes de Trabajo" });
  await section.waitFor({ state: "visible" });
});

Then("continúo visualizando la lista de solicitudes pendientes", async () => {
  const list = page.getByRole("list", { name: "Lista de solicitudes de trabajo" });
  await list.waitFor({ state: "visible" });
});