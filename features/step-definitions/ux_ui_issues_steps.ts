import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { page } from "./landing_page_visualization_steps";
import { ROUTES } from "../../lib/routes";
import { AuthSession } from "../../infrastructure/auth/types";
import { MOCK_SESSION_COOKIE } from "../../infrastructure/auth/mock-adapter";
import { addApiStub } from "./stubs-helper";
import { setConsumerSession } from "./initiate_chat_with_provider_steps";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

let consumerContacts: any[] = [];
let providerContacts: any[] = [];
let originalContactsWidth = 0;
let savedScrollTop = 0;

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

function buildConsumerContacts() {
  return [
    {
      id: "conv-1",
      providerId: "provider-001",
      providerName: "Juan",
      providerSurname: "Gómez",
      lastMessage: "Hola, ¿podés venir mañana?",
      lastMessageAt: new Date(Date.now() - 60000).toISOString(),
      pending: false,
    },
    {
      id: "conv-2",
      providerId: "provider-002",
      providerName: "Lucía",
      providerSurname: "Martínez",
      lastMessage: "Gracias por tu presupuesto",
      lastMessageAt: new Date(Date.now() - 7200000).toISOString(),
      pending: false,
    },
  ];
}

function buildProviderContacts() {
  return [
    {
      id: "conv-1",
      consumerId: "consumer-001",
      consumerName: "Andrés",
      consumerSurname: "Test",
      lastMessage: "Hola, necesito un presupuesto",
      lastMessageAt: new Date(Date.now() - 60000).toISOString(),
      pending: false,
    },
    {
      id: "conv-2",
      consumerId: "consumer-002",
      consumerName: "María",
      consumerSurname: "Fernández",
      lastMessage: "Confirmo para el jueves",
      lastMessageAt: new Date(Date.now() - 7200000).toISOString(),
      pending: false,
    },
  ];
}

function buildManyMessages(conversationId: number, counterpartId: string, counterpartRole: "provider" | "consumer") {
  return Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    sender_role: i % 2 === 0 ? "consumer" : counterpartRole,
    content: `Msg ${conversationId}-${i + 1}`,
    created_on: new Date(Date.now() - (12 - i) * 60000).toISOString(),
  }));
}

Given("que estoy en la pantalla de mensajes como consumidor con conversaciones", async () => {
  await setConsumerSession();

  consumerContacts = buildConsumerContacts();
  await addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: consumerContacts.map(c => ({
      id: c.id.replace("conv-", ""),
      status: "accepted",
      counterpart: {
        id: c.providerId,
        role: "provider",
        name: c.providerName,
        surname: c.providerSurname,
        category_name: "Plomería",
      },
      last_message: {
        id: 1,
        sender_role: "consumer",
        content: c.lastMessage,
        created_on: c.lastMessageAt,
      },
      updated_on: c.lastMessageAt,
    })),
  });

  await page.goto(APP_URL + ROUTES.consumer.messages, { waitUntil: "networkidle" });
  const list = page.getByRole("list", { name: "Lista de conversaciones" });
  await list.waitFor({ state: "visible", timeout: 10000 });
});

Given("que estoy en la pantalla de mensajes como prestador con conversaciones", async () => {
  await setProviderSession();

  providerContacts = buildProviderContacts();
  await addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: providerContacts.map(c => ({
      id: c.id.replace("conv-", ""),
      status: "accepted",
      counterpart: {
        id: c.consumerId,
        role: "consumer",
        name: c.consumerName,
        surname: c.consumerSurname,
        category_name: "Plomería",
      },
      last_message: {
        id: 1,
        sender_role: "consumer",
        content: c.lastMessage,
        created_on: c.lastMessageAt,
      },
      updated_on: c.lastMessageAt,
    })),
  });

  await page.goto(APP_URL + ROUTES.provider.messages, { waitUntil: "networkidle" });
  const list = page.getByRole("list", { name: "Lista de conversaciones" });
  await list.waitFor({ state: "visible", timeout: 10000 });
});

Given("que estoy chateando con un prestador con varios mensajes en la conversación", async () => {
  await setConsumerSession();

  consumerContacts = buildConsumerContacts();
  await addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: consumerContacts.map(c => ({
      id: c.id.replace("conv-", ""),
      status: "accepted",
      counterpart: {
        id: c.providerId,
        role: "provider",
        name: c.providerName,
        surname: c.providerSurname,
        category_name: "Plomería",
      },
      last_message: {
        id: 1,
        sender_role: "consumer",
        content: c.lastMessage,
        created_on: c.lastMessageAt,
      },
      updated_on: c.lastMessageAt,
    })),
  });

  const firstContact = consumerContacts[0];
  const firstConvId = firstContact.id.replace("conv-", "");
  await addApiStub({
    method: "GET",
    endpoint: `/conversations/${firstConvId}`,
    status: 200,
    body: {
      id: Number(firstConvId),
      status: "accepted",
      counterpart: {
        id: firstContact.providerId,
        role: "provider",
        name: firstContact.providerName,
        surname: firstContact.providerSurname,
        category_name: "Plomería",
      },
      messages: buildManyMessages(Number(firstConvId), firstContact.providerId, "provider"),
      updated_on: new Date().toISOString(),
    },
  });

  await page.goto(APP_URL + ROUTES.consumer.messages + `?provider_id=${firstContact.providerId}&name=${firstContact.providerName}&surname=${firstContact.providerSurname}`, { waitUntil: "networkidle" });

  const messagesList = page.locator("[data-testid='messages-list']");
  await messagesList.waitFor({ state: "visible", timeout: 10000 });
});

Given("que estoy chateando con un consumidor con varios mensajes en la conversación", async () => {
  await setProviderSession();

  providerContacts = buildProviderContacts();
  await addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: providerContacts.map(c => ({
      id: c.id.replace("conv-", ""),
      status: "accepted",
      counterpart: {
        id: c.consumerId,
        role: "consumer",
        name: c.consumerName,
        surname: c.consumerSurname,
        category_name: "Plomería",
      },
      last_message: {
        id: 1,
        sender_role: "consumer",
        content: c.lastMessage,
        created_on: c.lastMessageAt,
      },
      updated_on: c.lastMessageAt,
    })),
  });

  const firstContact = providerContacts[0];
  const firstConvId = firstContact.id.replace("conv-", "");
  await addApiStub({
    method: "GET",
    endpoint: `/conversations/${firstConvId}`,
    status: 200,
    body: {
      id: Number(firstConvId),
      status: "accepted",
      counterpart: {
        id: firstContact.consumerId,
        role: "consumer",
        name: firstContact.consumerName,
        surname: firstContact.consumerSurname,
        category_name: "Plomería",
      },
      messages: buildManyMessages(Number(firstConvId), firstContact.consumerId, "consumer"),
      updated_on: new Date().toISOString(),
    },
  });

  await page.goto(APP_URL + ROUTES.provider.messages + `?consumer_id=${firstContact.consumerId}`, { waitUntil: "networkidle" });

  const messagesList = page.locator("[data-testid='messages-list']");
  await messagesList.waitFor({ state: "visible", timeout: 10000 });
});

Given("hice scroll en la conversación", async () => {
  const messagesList = page.locator("[data-testid='messages-list']");
  await messagesList.waitFor({ state: "visible", timeout: 10000 });

  const scrollHeight = await messagesList.evaluate(el => el.scrollHeight);
  const clientHeight = await messagesList.evaluate(el => el.clientHeight);

  const targetScrollTop = Math.max(0, Math.floor((scrollHeight - clientHeight) / 2));

  await messagesList.evaluate((el, top) => {
    el.scrollTop = top;
    el.dispatchEvent(new Event("scroll"));
  }, targetScrollTop);

  await page.waitForTimeout(200);

  savedScrollTop = await messagesList.evaluate(el => el.scrollTop);
  assert.ok(scrollHeight > clientHeight, "La lista de mensajes no es lo suficientemente larga como para hacer scroll");
  assert.ok(savedScrollTop > 0, "El scroll no se aplicó a la conversación");
});

When("arrastro el separador de la lista de contactos para reducir su ancho", async () => {
  const sidebar = page.getByRole("region", { name: "Mensajes" });
  await sidebar.waitFor({ state: "visible", timeout: 10000 });

  const sidebarBox = await sidebar.boundingBox();
  originalContactsWidth = sidebarBox?.width ?? 0;

  const handle = page.getByRole("separator", { name: /redimensionar lista/i });
  await handle.waitFor({ state: "visible", timeout: 10000 });

  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error("No se pudo obtener la posición del separador");

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 120, startY, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(200);
});

When("arrastro el separador de la lista de conversaciones para ampliar su ancho", async () => {
  const sidebar = page.getByRole("region", { name: "Mensajes" });
  await sidebar.waitFor({ state: "visible", timeout: 10000 });

  const sidebarBox = await sidebar.boundingBox();
  originalContactsWidth = sidebarBox?.width ?? 0;

  const handle = page.getByRole("separator", { name: /redimensionar lista/i });
  await handle.waitFor({ state: "visible", timeout: 10000 });

  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error("No se pudo obtener la posición del separador");

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 120, startY, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(200);
});

Then("el ancho de la lista de contactos es menor al inicial", async () => {
  const sidebar = page.getByRole("region", { name: "Mensajes" });
  await sidebar.waitFor({ state: "visible", timeout: 10000 });

  const sidebarBox = await sidebar.boundingBox();
  const newWidth = sidebarBox?.width ?? 0;

  assert.ok(newWidth < originalContactsWidth, `Se esperaba que el ancho sea menor. Inicial: ${originalContactsWidth}, actual: ${newWidth}`);
});

Then("el ancho de la lista de conversaciones es mayor al inicial", async () => {
  const sidebar = page.getByRole("region", { name: "Mensajes" });
  await sidebar.waitFor({ state: "visible", timeout: 10000 });

  const sidebarBox = await sidebar.boundingBox();
  const newWidth = sidebarBox?.width ?? 0;

  assert.ok(newWidth > originalContactsWidth, `Se esperaba que el ancho sea mayor. Inicial: ${originalContactsWidth}, actual: ${newWidth}`);
});

When("arrastro el separador más allá del ancho mínimo permitido", async () => {
  const handle = page.getByRole("separator", { name: /redimensionar lista/i });
  await handle.waitFor({ state: "visible", timeout: 10000 });

  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error("No se pudo obtener la posición del separador");

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 9999, startY, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(200);
});

Then("la lista de contactos mantiene el ancho mínimo", async () => {
  const sidebar = page.locator("[data-testid='resizable-contacts-sidebar']");
  await sidebar.waitFor({ state: "visible", timeout: 10000 });

  const sidebarBox = await sidebar.boundingBox();
  const newWidth = sidebarBox?.width ?? 0;

  assert.ok(newWidth >= 220, `Se esperaba que el ancho sea al menos 220px (mínimo), pero es ${newWidth}px`);
});

When("cambio a otra conversación y vuelvo a abrir la conversación original", async () => {
  const messagesList = page.locator("[data-testid='messages-list']");
  const url = page.url();
  const isConsumer = url.includes(ROUTES.consumer.messages);
  const contacts = isConsumer ? consumerContacts : providerContacts;
  const secondContact = contacts[1];
  const firstContact = contacts[0];
  const otherFullName = `${secondContact.providerName ?? secondContact.consumerName} ${secondContact.providerSurname ?? secondContact.consumerSurname}`;
  const firstFullName = `${firstContact.providerName ?? firstContact.consumerName} ${firstContact.providerSurname ?? firstContact.consumerSurname}`;

  const list = page.getByRole("list", { name: "Lista de conversaciones" });
  await list.waitFor({ state: "visible", timeout: 10000 });

  const otherContact = list.getByRole("listitem").filter({ hasText: otherFullName }).first();
  await otherContact.click();
  await page.waitForTimeout(500);

  await messagesList.waitFor({ state: "visible", timeout: 10000 });

  await page.waitForTimeout(300);

  const firstContactItem = list.getByRole("listitem").filter({ hasText: firstFullName }).first();
  await firstContactItem.click();
  await page.waitForTimeout(500);

  await messagesList.waitFor({ state: "visible", timeout: 10000 });
});

Then("la conversación se muestra en la misma posición de scroll que dejé", async () => {
  const messagesList = page.locator("[data-testid='messages-list']");
  await messagesList.waitFor({ state: "visible", timeout: 10000 });

  await page.waitForTimeout(500);

  const currentScrollTop = await messagesList.evaluate(el => el.scrollTop);

  assert.ok(
    Math.abs(currentScrollTop - savedScrollTop) < 5,
    `Se esperaba que el scroll se preserve en ${savedScrollTop}, pero está en ${currentScrollTop}`
  );
});