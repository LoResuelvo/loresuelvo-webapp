import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, APP_URL } from "../support/world";
import { ROUTES } from "../../lib/routes";
import { AuthSession } from "../../infrastructure/auth/types";
import { MOCK_SESSION_COOKIE } from "../../infrastructure/auth/mock-adapter";


async function setProviderSession(world: CustomWorld) {
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

  await world.page.context().addCookies([
    {
      name: MOCK_SESSION_COOKIE,
      value: encodeURIComponent(JSON.stringify(session)),
      domain: "localhost",
      path: "/",
    },
  ]);
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

Given("que estoy en el dashboard de prestador", async function (this: CustomWorld) {
  await setProviderSession(this);
  await this.page.goto(APP_URL + ROUTES.provider.home, { waitUntil: "networkidle" });
});

When("navego a la sección de mensajes del dashboard", async function (this: CustomWorld) {
  await this.addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: mockConversations,
  });
  await this.page.goto(APP_URL + ROUTES.provider.messages, { waitUntil: "networkidle" });
});

When("accedo a la sección de mensajes", async function (this: CustomWorld) {
  await this.addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: mockConversations,
  });
  await this.page.goto(APP_URL + ROUTES.provider.messages, { waitUntil: "networkidle" });
});

When("visualizo la lista de mensajes", async function (this: CustomWorld) {
  await this.addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: mockConversations,
  });
  await this.page.goto(APP_URL + ROUTES.provider.messages, { waitUntil: "networkidle" });
});

Given("visualizo la lista de conversaciones", async function (this: CustomWorld) {
  // Already navigated in Given step
});

Given("que visualizo la lista de conversaciones", async function (this: CustomWorld) {
  await setProviderSession(this);

  await this.addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: mockConversations,
  });

  await this.page.goto(APP_URL + ROUTES.provider.messages, { waitUntil: "networkidle" });
  const section = this.page.getByRole("region", { name: "Mensajes" });
  await section.waitFor({ state: "visible" });
});

Then("visualizo una lista de conversaciones", async function (this: CustomWorld) {
  const section = this.page.getByRole("region", { name: "Mensajes" });
  await section.waitFor({ state: "visible" });
  const list = section.getByRole("list", { name: "Lista de conversaciones" });
  await list.waitFor({ state: "visible" });
  assert.ok(await list.isVisible(), "No se visualiza la lista de conversaciones");
});

Given("que tengo conversaciones asociadas a mi cuenta de prestador", async function (this: CustomWorld) {
  await setProviderSession(this);

  await this.addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: mockConversations,
  });

  await this.page.goto(APP_URL + ROUTES.provider.messages, { waitUntil: "networkidle" });
});

Then("veo todas las conversaciones asociadas a mi cuenta", async function (this: CustomWorld) {
  const list = this.page.getByRole("list", { name: "Lista de conversaciones" });
  await list.waitFor({ state: "visible" });
  const itemsCount = await list.getByRole("listitem").count();
  assert.ok(itemsCount > 0, "No se visualiza ninguna conversación");
});

Given("que tengo conversaciones pendientes y aceptadas", async function (this: CustomWorld) {
  await setProviderSession(this);

  await this.addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: mockConversations,
  });

  await this.page.goto(APP_URL + ROUTES.provider.messages, { waitUntil: "networkidle" });
});

Then("cada conversación muestra el nombre del consumidor", async function (this: CustomWorld) {
  const list = this.page.getByRole("list", { name: "Lista de conversaciones" });
  const items = list.getByRole("listitem");
  const count = await items.count();
  assert.ok(count > 0, "No se visualiza ninguna conversación");

  for (let i = 0; i < count; i++) {
    const item = items.nth(i);
    const nameElement = item.locator("[data-field='consumer-name']");
    assert.ok(await nameElement.isVisible(), `La conversación ${i + 1} no muestra el nombre del consumidor`);
  }
});

Given("que tengo conversaciones con mensajes", async function (this: CustomWorld) {
  await setProviderSession(this);

  await this.addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: mockConversations,
  });

  await this.page.goto(APP_URL + ROUTES.provider.messages, { waitUntil: "networkidle" });
});

Given("que tengo conversaciones pendientes de aceptación", async function (this: CustomWorld) {
  await setProviderSession(this);

  await this.addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: mockConversations,
  });

  await this.page.goto(APP_URL + ROUTES.provider.messages, { waitUntil: "networkidle" });
});

Given("me encuentro visualizando la lista de conversaciones", async function (this: CustomWorld) {
  // Already navigated in Given step
});

Given("me encuentro visualizando el detalle de una solicitud pendiente", async function (this: CustomWorld) {
  await setProviderSession(this);

  await this.addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: mockConversations,
  });

  await this.page.goto(APP_URL + ROUTES.provider.messages, { waitUntil: "networkidle" });
});

Then("cada conversación muestra el último mensaje intercambiado", async function (this: CustomWorld) {
  const list = this.page.getByRole("list", { name: "Lista de conversaciones" });
  const items = list.getByRole("listitem");
  const count = await items.count();
  assert.ok(count > 0, "No se visualiza ninguna conversación");

  for (let i = 0; i < count; i++) {
    const item = items.nth(i);
    const lastMessageElement = item.locator("[data-field='last-message']");
    assert.ok(await lastMessageElement.isVisible(), `La conversación ${i + 1} no muestra el último mensaje`);
  }
});

Then("cada conversación muestra la fecha u hora del último mensaje", async function (this: CustomWorld) {
  const list = this.page.getByRole("list", { name: "Lista de conversaciones" });
  const items = list.getByRole("listitem");
  const count = await items.count();
  assert.ok(count > 0, "No se visualiza ninguna conversación");

  for (let i = 0; i < count; i++) {
    const item = items.nth(i);
    const dateElement = item.locator("[data-field='last-message-at']");
    assert.ok(await dateElement.isVisible(), `La conversación ${i + 1} no muestra la fecha del último mensaje`);
  }
});

Then("las conversaciones pendientes se identifican visualmente de manera distintiva", async function (this: CustomWorld) {
  const pendingItems = this.page.locator("[data-status='pending']");
  const count = await pendingItems.count();
  assert.ok(count > 0, "No se visualizan conversaciones pendientes");
});

When("hago clic en una conversación", async function (this: CustomWorld) {
  const firstConversation = this.page.getByRole("list", { name: "Lista de conversaciones" }).getByRole("listitem").first();
  await firstConversation.click();
  await this.page.waitForLoadState("networkidle");
});

Then("se muestra el contenido completo de la conversación", async function (this: CustomWorld) {
  const messagesSection = this.page.getByRole("region", { name: "Detalle de conversación" });
  await messagesSection.waitFor({ state: "visible" });
  assert.ok(await messagesSection.isVisible(), "No se muestra el contenido de la conversación");
});

Then("se abre el chat con el consumidor para iniciar la comunicación", async function (this: CustomWorld) {
  await this.page.waitForURL((url) => url.searchParams.has("consumer_id") || url.toString().includes("consumer_id"), { timeout: 10_000 });
  const currentUrl = this.page.url();
  assert.ok(currentUrl.includes("consumer_id"), `Expected URL to contain consumer_id but got: ${currentUrl}`);
  
  await this.page.waitForLoadState("networkidle");
  
  const chatPanel = this.page.locator("[data-testid='chat-panel']");
  await chatPanel.waitFor({ state: "attached", timeout: 15000 });
});