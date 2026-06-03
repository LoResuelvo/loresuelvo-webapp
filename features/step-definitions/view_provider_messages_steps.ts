import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { page } from "./landing_page_visualization_steps";
import { ROUTES } from "../../lib/routes";
import { AuthSession } from "../../lib/auth/types";
import { MOCK_SESSION_COOKIE } from "../../lib/auth/mock-adapter";
import { addApiStub } from "./stubs-helper";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

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

const mockConversations = [
  {
    id: 1,
    status: "accepted",
    counterpart: {
      id: 10,
      role: "consumer",
      name: "María",
      surname: "Fernández",
      category_name: "Plomería",
    },
    last_message: {
      id: 1,
      sender_role: "consumer",
      content: "Hola, me gustaría contratarte para el trabajo",
      created_on: new Date().toISOString(),
    },
    updated_on: new Date().toISOString(),
  },
  {
    id: 2,
    status: "pending",
    counterpart: {
      id: 11,
      role: "consumer",
      name: "Javier",
      surname: "Torres",
      category_name: "Electricidad",
    },
    last_message: {
      id: 2,
      sender_role: "consumer",
      content: "Necesito reparar una fuga de agua",
      created_on: new Date(Date.now() - 3600000).toISOString(),
    },
    updated_on: new Date(Date.now() - 3600000).toISOString(),
  },
];

Given("que estoy en el dashboard de prestador", async () => {
  await setProviderSession();
  await page.goto(APP_URL + ROUTES.provider.home, { waitUntil: "networkidle" });
});

When("navego a la sección de mensajes del dashboard", async () => {
  await addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: mockConversations,
  });
  await page.goto(APP_URL + ROUTES.provider.messages, { waitUntil: "networkidle" });
});

When("accedo a la sección de mensajes", async () => {
  await addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: mockConversations,
  });
  await page.goto(APP_URL + ROUTES.provider.messages, { waitUntil: "networkidle" });
});

When("visualizo la lista de mensajes", async () => {
  await addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: mockConversations,
  });
  await page.goto(APP_URL + ROUTES.provider.messages, { waitUntil: "networkidle" });
});

When("visualizo la lista de conversaciones", async () => {
  // Already navigated in Given step
});

Then("visualizo una lista de conversaciones", async () => {
  const section = page.getByRole("region", { name: "Mensajes" });
  await section.waitFor({ state: "visible" });
  const list = section.getByRole("list", { name: "Lista de conversaciones" });
  await list.waitFor({ state: "visible" });
  assert.ok(await list.isVisible(), "No se visualiza la lista de conversaciones");
});

Given("que tengo conversaciones asociadas a mi cuenta de prestador", async () => {
  await setProviderSession();

  await addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: mockConversations,
  });

  await page.goto(APP_URL + ROUTES.provider.messages, { waitUntil: "networkidle" });
});

Then("veo todas las conversaciones asociadas a mi cuenta", async () => {
  const list = page.getByRole("list", { name: "Lista de conversaciones" });
  await list.waitFor({ state: "visible" });
  const itemsCount = await list.getByRole("listitem").count();
  assert.ok(itemsCount > 0, "No se visualiza ninguna conversación");
});

Given("que tengo conversaciones pendientes y aceptadas", async () => {
  await setProviderSession();

  await addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: mockConversations,
  });

  await page.goto(APP_URL + ROUTES.provider.messages, { waitUntil: "networkidle" });
});

Then("cada conversación muestra el nombre del consumidor", async () => {
  const list = page.getByRole("list", { name: "Lista de conversaciones" });
  const items = list.getByRole("listitem");
  const count = await items.count();
  assert.ok(count > 0, "No se visualiza ninguna conversación");

  for (let i = 0; i < count; i++) {
    const item = items.nth(i);
    const nameElement = item.locator("[data-field='consumer-name']");
    assert.ok(await nameElement.isVisible(), `La conversación ${i + 1} no muestra el nombre del consumidor`);
  }
});

Then("cada conversación muestra el último mensaje intercambiado", async () => {
  const list = page.getByRole("list", { name: "Lista de conversaciones" });
  const items = list.getByRole("listitem");
  const count = await items.count();
  assert.ok(count > 0, "No se visualiza ninguna conversación");

  for (let i = 0; i < count; i++) {
    const item = items.nth(i);
    const lastMessageElement = item.locator("[data-field='last-message']");
    assert.ok(await lastMessageElement.isVisible(), `La conversación ${i + 1} no muestra el último mensaje`);
  }
});

Then("cada conversación muestra la fecha u hora del último mensaje", async () => {
  const list = page.getByRole("list", { name: "Lista de conversaciones" });
  const items = list.getByRole("listitem");
  const count = await items.count();
  assert.ok(count > 0, "No se visualiza ninguna conversación");

  for (let i = 0; i < count; i++) {
    const item = items.nth(i);
    const dateElement = item.locator("[data-field='last-message-at']");
    assert.ok(await dateElement.isVisible(), `La conversación ${i + 1} no muestra la fecha del último mensaje`);
  }
});

Then("las conversaciones pendientes se identifican visualicamente de manera distintiva", async () => {
  const pendingItems = page.locator("[data-status='pending']");
  const count = await pendingItems.count();
  assert.ok(count > 0, "No se visualizan conversaciones pendientes");
});

When("hago clic en una conversación", async () => {
  const firstConversation = page.getByRole("list", { name: "Lista de conversaciones" }).getByRole("listitem").first();
  await firstConversation.click();
  await page.waitForLoadState("networkidle");
});

Then("se muestra el contenido completo de la conversación", async () => {
  const messagesSection = page.getByRole("region", { name: "Detalle de conversación" });
  await messagesSection.waitFor({ state: "visible" });
  assert.ok(await messagesSection.isVisible(), "No se muestra el contenido de la conversación");
});