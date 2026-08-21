import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, APP_URL } from "../support/world";
import { ROUTES } from "../../lib/routes";
import { aConversation, aConversationDetail, aConversationMessage, aCounterpart } from "../support/factories";

interface ContactData {
  id: string;
  counterpartId: string;
  counterpartName: string;
  counterpartSurname: string;
  lastMessage: string;
  lastMessageAt: string;
}

let consumerContacts: ContactData[] = [];
let providerContacts: ContactData[] = [];
let originalContactsWidth = 0;
let savedScrollTop = 0;

function buildConsumerContacts(): ContactData[] {
  return [
    {
      id: "conv-1",
      counterpartId: "provider-001",
      counterpartName: "Juan",
      counterpartSurname: "Gómez",
      lastMessage: "Hola, ¿podés venir mañana?",
      lastMessageAt: new Date(Date.now() - 60000).toISOString(),
    },
    {
      id: "conv-2",
      counterpartId: "provider-002",
      counterpartName: "Lucía",
      counterpartSurname: "Martínez",
      lastMessage: "Gracias por tu presupuesto",
      lastMessageAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ];
}

function buildProviderContacts(): ContactData[] {
  return [
    {
      id: "conv-1",
      counterpartId: "consumer-001",
      counterpartName: "Andrés",
      counterpartSurname: "Test",
      lastMessage: "Hola, necesito un presupuesto",
      lastMessageAt: new Date(Date.now() - 60000).toISOString(),
    },
    {
      id: "conv-2",
      counterpartId: "consumer-002",
      counterpartName: "María",
      counterpartSurname: "Fernández",
      lastMessage: "Confirmo para el jueves",
      lastMessageAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ];
}

function buildManyMessages(conversationId: number, counterpartRole: "provider" | "consumer") {
  return Array.from({ length: 12 }, (_, i) =>
    aConversationMessage({
      id: i + 1,
      sender_role: i % 2 === 0 ? "consumer" : counterpartRole,
      content: `Msg ${conversationId}-${i + 1}`,
      created_on: new Date(Date.now() - (12 - i) * 60000).toISOString(),
    })
  );
}

function mapContactsToConversations(contacts: ContactData[], counterpartRole: "provider" | "consumer") {
  return contacts.map((c) =>
    aConversation({
      id: Number(c.id.replace("conv-", "")),
      status: "accepted",
      counterpart: aCounterpart({
        id: Number(c.counterpartId.replace(/[^0-9]/g, "") || 1),
        role: counterpartRole,
        name: c.counterpartName,
        surname: c.counterpartSurname,
        category_name: "Plomería",
      }),
      last_message: aConversationMessage({
        id: 1,
        sender_role: "consumer",
        content: c.lastMessage,
        created_on: c.lastMessageAt,
      }),
      updated_on: c.lastMessageAt,
    })
  );
}

Given("que estoy en la pantalla de mensajes como consumidor con conversaciones", async function (this: CustomWorld) {
  await this.setSession("consumer", {
    id: "consumer-001",
    email: "consumidor@loresuelvo.test",
    firstName: "Ana",
    lastName: "Pérez",
    isOnboarded: true,
  });

  consumerContacts = buildConsumerContacts();
  await this.stubGet("/conversations", mapContactsToConversations(consumerContacts, "provider"));

  await this.page.goto(APP_URL + ROUTES.consumer.messages, { waitUntil: "networkidle" });
  const list = this.page.getByRole("list", { name: "Lista de conversaciones" });
  await list.waitFor({ state: "visible", timeout: 10000 });
});

Given("que estoy en la pantalla de mensajes como prestador con conversaciones", async function (this: CustomWorld) {
  await this.setSession("provider", {
    id: "provider-001",
    email: "prestador@loresuelvo.test",
    firstName: "Paula",
    lastName: "Rios",
    isOnboarded: true,
  });

  providerContacts = buildProviderContacts();
  await this.stubGet("/conversations", mapContactsToConversations(providerContacts, "consumer"));

  await this.page.goto(APP_URL + ROUTES.provider.messages, { waitUntil: "networkidle" });
  const list = this.page.getByRole("list", { name: "Lista de conversaciones" });
  await list.waitFor({ state: "visible", timeout: 10000 });
});

Given(
  "que estoy chateando con un prestador con varios mensajes en la conversación",
  async function (this: CustomWorld) {
    await this.setSession("consumer", {
      id: "consumer-001",
      email: "consumidor@loresuelvo.test",
      firstName: "Ana",
      lastName: "Pérez",
      isOnboarded: true,
    });

    consumerContacts = buildConsumerContacts();
    await this.stubGet("/conversations", mapContactsToConversations(consumerContacts, "provider"));

    const firstContact = consumerContacts[0];
    const firstConvId = Number(firstContact.id.replace("conv-", ""));
    await this.stubGet(
      `/conversations/${firstConvId}`,
      aConversationDetail({
        id: firstConvId,
        status: "accepted",
        counterpart: aCounterpart({
          id: Number(firstContact.counterpartId.replace(/[^0-9]/g, "") || 1),
          role: "provider",
          name: firstContact.counterpartName,
          surname: firstContact.counterpartSurname,
          category_name: "Plomería",
        }),
        messages: buildManyMessages(firstConvId, "provider"),
        updated_on: new Date().toISOString(),
      })
    );

    await this.page.goto(
      APP_URL +
        ROUTES.consumer.messages +
        `?provider_id=${firstContact.counterpartId}&name=${firstContact.counterpartName}&surname=${firstContact.counterpartSurname}`,
      { waitUntil: "networkidle" }
    );

    const messagesList = this.page.locator("[data-testid='messages-list']");
    await messagesList.waitFor({ state: "visible", timeout: 10000 });
  }
);

Given(
  "que estoy chateando con un consumidor con varios mensajes en la conversación",
  async function (this: CustomWorld) {
    await this.setSession("provider", {
      id: "provider-001",
      email: "prestador@loresuelvo.test",
      firstName: "Paula",
      lastName: "Rios",
      isOnboarded: true,
    });

    providerContacts = buildProviderContacts();
    await this.stubGet("/conversations", mapContactsToConversations(providerContacts, "consumer"));

    const firstContact = providerContacts[0];
    const firstConvId = Number(firstContact.id.replace("conv-", ""));
    await this.stubGet(
      `/conversations/${firstConvId}`,
      aConversationDetail({
        id: firstConvId,
        status: "accepted",
        counterpart: aCounterpart({
          id: Number(firstContact.counterpartId.replace(/[^0-9]/g, "") || 1),
          role: "consumer",
          name: firstContact.counterpartName,
          surname: firstContact.counterpartSurname,
          category_name: "Plomería",
        }),
        messages: buildManyMessages(firstConvId, "consumer"),
        updated_on: new Date().toISOString(),
      })
    );

    await this.page.goto(APP_URL + ROUTES.provider.messages + `?consumer_id=${firstContact.counterpartId}`, {
      waitUntil: "networkidle",
    });

    const messagesList = this.page.locator("[data-testid='messages-list']");
    await messagesList.waitFor({ state: "visible", timeout: 10000 });
  }
);

Given("hice scroll en la conversación", async function (this: CustomWorld) {
  const messagesList = this.page.locator("[data-testid='messages-list']");
  await messagesList.waitFor({ state: "visible", timeout: 10000 });

  const scrollHeight = await messagesList.evaluate((el) => el.scrollHeight);
  const clientHeight = await messagesList.evaluate((el) => el.clientHeight);

  const targetScrollTop = Math.max(0, Math.floor((scrollHeight - clientHeight) / 2));

  await messagesList.evaluate((el, top) => {
    el.scrollTop = top;
    el.dispatchEvent(new Event("scroll"));
  }, targetScrollTop);

  await this.page.waitForTimeout(200);

  savedScrollTop = await messagesList.evaluate((el) => el.scrollTop);
  assert.ok(scrollHeight > clientHeight, "La lista de mensajes no es lo suficientemente larga como para hacer scroll");
  assert.ok(savedScrollTop > 0, "El scroll no se aplicó a la conversación");
});

When("arrastro el separador de la lista de contactos para reducir su ancho", async function (this: CustomWorld) {
  const sidebar = this.page.getByRole("region", { name: "Mensajes" });
  await sidebar.waitFor({ state: "visible", timeout: 10000 });

  const sidebarBox = await sidebar.boundingBox();
  originalContactsWidth = sidebarBox?.width ?? 0;

  const handle = this.page.getByRole("separator", { name: /redimensionar lista/i });
  await handle.waitFor({ state: "visible", timeout: 10000 });

  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error("No se pudo obtener la posición del separador");

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;

  await this.page.mouse.move(startX, startY);
  await this.page.mouse.down();
  await this.page.mouse.move(startX - 120, startY, { steps: 10 });
  await this.page.mouse.up();
  await this.page.waitForTimeout(200);
});

When("arrastro el separador de la lista de conversaciones para ampliar su ancho", async function (this: CustomWorld) {
  const sidebar = this.page.getByRole("region", { name: "Mensajes" });
  await sidebar.waitFor({ state: "visible", timeout: 10000 });

  const sidebarBox = await sidebar.boundingBox();
  originalContactsWidth = sidebarBox?.width ?? 0;

  const handle = this.page.getByRole("separator", { name: /redimensionar lista/i });
  await handle.waitFor({ state: "visible", timeout: 10000 });

  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error("No se pudo obtener la posición del separador");

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;

  await this.page.mouse.move(startX, startY);
  await this.page.mouse.down();
  await this.page.mouse.move(startX + 120, startY, { steps: 10 });
  await this.page.mouse.up();
  await this.page.waitForTimeout(200);
});

Then("el ancho de la lista de contactos es menor al inicial", async function (this: CustomWorld) {
  const sidebar = this.page.getByRole("region", { name: "Mensajes" });
  await sidebar.waitFor({ state: "visible", timeout: 10000 });

  const sidebarBox = await sidebar.boundingBox();
  const newWidth = sidebarBox?.width ?? 0;

  assert.ok(
    newWidth < originalContactsWidth,
    `Se esperaba que el ancho sea menor. Inicial: ${originalContactsWidth}, actual: ${newWidth}`
  );
});

Then("el ancho de la lista de conversaciones es mayor al inicial", async function (this: CustomWorld) {
  const sidebar = this.page.getByRole("region", { name: "Mensajes" });
  await sidebar.waitFor({ state: "visible", timeout: 10000 });

  const sidebarBox = await sidebar.boundingBox();
  const newWidth = sidebarBox?.width ?? 0;

  assert.ok(
    newWidth > originalContactsWidth,
    `Se esperaba que el ancho sea mayor. Inicial: ${originalContactsWidth}, actual: ${newWidth}`
  );
});

When("arrastro el separador más allá del ancho mínimo permitido", async function (this: CustomWorld) {
  const handle = this.page.getByRole("separator", { name: /redimensionar lista/i });
  await handle.waitFor({ state: "visible", timeout: 10000 });

  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error("No se pudo obtener la posición del separador");

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;

  await this.page.mouse.move(startX, startY);
  await this.page.mouse.down();
  await this.page.mouse.move(startX - 9999, startY, { steps: 20 });
  await this.page.mouse.up();
  await this.page.waitForTimeout(200);
});

Then("la lista de contactos mantiene el ancho mínimo", async function (this: CustomWorld) {
  const sidebar = this.page.locator("[data-testid='resizable-contacts-sidebar']");
  await sidebar.waitFor({ state: "visible", timeout: 10000 });

  const sidebarBox = await sidebar.boundingBox();
  const newWidth = sidebarBox?.width ?? 0;

  assert.ok(newWidth >= 220, `Se esperaba que el ancho sea al menos 220px (mínimo), pero es ${newWidth}px`);
});

When("escribo el mensaje {string} en la caja de texto", async function (this: CustomWorld, texto: string) {
  const input = this.page.getByRole("textbox", { name: /escribe un mensaje/i });
  await input.waitFor({ state: "visible", timeout: 10000 });
  await input.fill(texto);
  await this.page.waitForTimeout(200);
});

When("que escribí el mensaje {string} en la caja de texto", async function (this: CustomWorld, texto: string) {
  const input = this.page.getByRole("textbox", { name: /escribe un mensaje/i });
  await input.waitFor({ state: "visible", timeout: 10000 });
  await input.fill(texto);
  await this.page.waitForTimeout(200);
});

When("navego a inicio durante el borrador", async function (this: CustomWorld) {
  await this.page.goto(APP_URL + ROUTES.consumer.home, { waitUntil: "networkidle" });
});

When("vuelvo a la conversación con el prestador", async function (this: CustomWorld) {
  const firstContact = consumerContacts[0];
  await this.page.goto(
    APP_URL +
      ROUTES.consumer.messages +
      `?provider_id=${firstContact.counterpartId}&name=${firstContact.counterpartName}&surname=${firstContact.counterpartSurname}`,
    { waitUntil: "networkidle" }
  );
  const messagesList = this.page.locator("[data-testid='messages-list']");
  await messagesList.waitFor({ state: "visible", timeout: 10000 });
});

Then("veo el mensaje {string} en la caja de texto", async function (this: CustomWorld, texto: string) {
  const input = this.page.getByRole("textbox", { name: /escribe un mensaje/i });
  await input.waitFor({ state: "visible", timeout: 10000 });
  await this.page.waitForTimeout(300);
  const value = await input.inputValue();
  assert.strictEqual(value, texto, `Se esperaba que la caja contenga "${texto}" pero contiene "${value}"`);
});

Then("la imagen {string} continúa adjunta al mensaje", async function (this: CustomWorld, imagen: string) {
  const thumbnail = this.page.locator(`img[alt*="${imagen}"]`).first();
  await thumbnail.waitFor({ state: "attached", timeout: 10000 });
});

When("envío el mensaje de borrador {string}", async function (this: CustomWorld, texto: string) {
  const input = this.page.getByRole("textbox", { name: /escribe un mensaje/i });
  await input.waitFor({ state: "visible", timeout: 10000 });

  await this.stubPost(
    "/conversations/1/messages",
    201,
    aConversationMessage({
      id: 999,
      sender_role: "consumer",
      content: texto,
      created_on: new Date().toISOString(),
    })
  );

  await input.fill(texto);
  const sendButton = this.page.getByRole("button", { name: /enviar/i });
  await sendButton.click();
  await this.page.waitForTimeout(500);
});

Then("la caja de texto queda vacía", async function (this: CustomWorld) {
  const input = this.page.getByRole("textbox", { name: /escribe un mensaje/i });
  await input.waitFor({ state: "visible", timeout: 10000 });
  await this.page.waitForTimeout(300);
  const value = await input.inputValue();
  assert.strictEqual(value, "", `Se esperaba que la caja esté vacía pero contiene "${value}"`);
});

Then("si navego a la página de inicio y vuelvo, la caja de texto sigue vacía", async function (this: CustomWorld) {
  await this.page.goto(APP_URL + ROUTES.consumer.home, { waitUntil: "networkidle" });

  const firstContact = consumerContacts[0];
  await this.page.goto(
    APP_URL +
      ROUTES.consumer.messages +
      `?provider_id=${firstContact.counterpartId}&name=${firstContact.counterpartName}&surname=${firstContact.counterpartSurname}`,
    { waitUntil: "networkidle" }
  );

  const input = this.page.getByRole("textbox", { name: /escribe un mensaje/i });
  await input.waitFor({ state: "visible", timeout: 10000 });
  await this.page.waitForTimeout(300);
  const value = await input.inputValue();
  assert.strictEqual(value, "", `Se esperaba que la caja esté vacía tras navegar pero contiene "${value}"`);
});

When("cambio a otra conversación y vuelvo a abrir la conversación original", async function (this: CustomWorld) {
  const messagesList = this.page.locator("[data-testid='messages-list']");
  const url = this.page.url();
  const isConsumer = url.includes(ROUTES.consumer.messages);
  const contacts = isConsumer ? consumerContacts : providerContacts;
  const secondContact = contacts[1];
  const firstContact = contacts[0];
  const otherFullName = `${secondContact.counterpartName} ${secondContact.counterpartSurname}`;
  const firstFullName = `${firstContact.counterpartName} ${firstContact.counterpartSurname}`;

  const list = this.page.getByRole("list", { name: "Lista de conversaciones" });
  await list.waitFor({ state: "visible", timeout: 10000 });

  const otherContact = list.getByRole("listitem").filter({ hasText: otherFullName }).first();
  await otherContact.click();
  await this.page.waitForTimeout(500);

  await messagesList.waitFor({ state: "visible", timeout: 10000 });

  await this.page.waitForTimeout(300);

  const firstContactItem = list.getByRole("listitem").filter({ hasText: firstFullName }).first();
  await firstContactItem.click();
  await this.page.waitForTimeout(500);

  await messagesList.waitFor({ state: "visible", timeout: 10000 });
});

Then("la conversación se muestra en la misma posición de scroll que dejé", async function (this: CustomWorld) {
  const messagesList = this.page.locator("[data-testid='messages-list']");
  await messagesList.waitFor({ state: "visible", timeout: 10000 });

  await this.page.waitForTimeout(500);

  const currentScrollTop = await messagesList.evaluate((el) => el.scrollTop);

  assert.ok(
    Math.abs(currentScrollTop - savedScrollTop) < 5,
    `Se esperaba que el scroll se preserve en ${savedScrollTop}, pero está en ${currentScrollTop}`
  );
});
