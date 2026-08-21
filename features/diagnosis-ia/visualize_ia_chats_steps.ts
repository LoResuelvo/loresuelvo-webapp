import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, APP_URL, visibleTimeout, attachedTimeout, waitTimeout, attachedState } from "../support/world";
import { ROUTES } from "../../lib/routes";
import { aAiConversation, aAiConversationDetail, aCategory, anAiMessage } from "../support/factories";

const CONV_1_MESSAGES = [
  anAiMessage({ id: 1, sender_role: "consumer", content: "Se está filtrando agua debajo de la bacha", created_on: "2026-06-18T10:00:00Z" }),
  anAiMessage({ id: 2, sender_role: "chatbot", content: "Revisá si el agua sale desde la rosca del sifón.", created_on: "2026-06-18T10:00:01Z" }),
];

When("visualizo el sidebar", async function (this: CustomWorld) {
  await this.setSession("consumer");

  if (!(await this.hasApiStub("GET", "/categories"))) {
    await this.stubGet("/categories", [
      aCategory({ id: 1, name: "Plomería" }),
      aCategory({ id: 2, name: "Electricista" }),
    ]);
  }

  await this.page.goto(`${APP_URL}${ROUTES.consumer.home}`, { waitUntil: "networkidle", timeout: 15000 });

  const sidebar = this.page.getByRole("navigation", {
    name: "Navegación del consumidor",
  });
  await sidebar.waitFor(visibleTimeout);
  assert.ok(await sidebar.isVisible(), "No se visualiza el sidebar");
});

Then("veo el apartado Chat con IA", async function (this: CustomWorld) {
  const option = this.page
    .getByRole("navigation", { name: "Navegación del consumidor" })
    .getByRole("link", { name: "Chat con IA" });
  await option.waitFor();
  assert.ok(await option.isVisible(), `No se visualiza la opción "Chat con IA"`);
});

Given("ingreso a la sección Chat con IA", async function (this: CustomWorld) {
  await this.setSession("consumer");

  const conv1 = aAiConversation({
    id: 1,
    title: "Pérdida de agua en la cocina",
    updated_on: "2026-06-18T12:00:00Z",
    last_message: anAiMessage({ id: 2, sender_role: "chatbot", content: "Revisá si el agua sale desde la rosca del sifón.", created_on: "2026-06-18T12:00:00Z" }),
  });
  
  const conv2 = aAiConversation({
    id: 2,
    title: "Problema con el gas",
    updated_on: "2026-06-17T10:00:00Z",
    last_message: anAiMessage({ id: 4, sender_role: "consumer", content: "Huele a gas en la cocina", created_on: "2026-06-17T10:00:00Z" }),
  });

  await this.stubGet("/chatbot/conversations", [conv1, conv2]);

  await this.stubGet("/conversations/1", aAiConversationDetail({
    id: 1,
    title: "Pérdida de agua en la cocina",
    messages: CONV_1_MESSAGES,
  }));

  await this.page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}`);
  await this.page.waitForLoadState("domcontentloaded");
});

Then("veo mis conversaciones anteriores con la IA", async function (this: CustomWorld) {
  const conversation = this.page.getByText("Pérdida de agua en la cocina");
  await conversation.waitFor(visibleTimeout);
  assert.ok(await conversation.isVisible(), "No se ve la conversación");
});

Then("cada conversación muestra un título", async function (this: CustomWorld) {
  const title = this.page.getByText("Pérdida de agua en la cocina");
  await title.waitFor(visibleTimeout);
  assert.ok(await title.isVisible(), "No se ve el título de la conversación");
});

Then("cada conversación muestra una preview del último mensaje intercambiado", async function (this: CustomWorld) {
  const preview = this.page.getByText("Revisá si el agua sale desde la rosca del sifón.");
  await preview.waitFor(visibleTimeout);
  assert.ok(await preview.isVisible(), "No se ve la preview del mensaje");
});

When("selecciono una conversación existente", async function (this: CustomWorld) {
  await this.page.getByText("Pérdida de agua en la cocina").click();
  await this.page.waitForLoadState("domcontentloaded");
});

Then("veo el historial completo de mensajes de esa conversación", async function (this: CustomWorld) {
  const userMessage = this.page.getByTestId("message-bubble-1");
  await userMessage.waitFor(visibleTimeout);
  assert.ok(await userMessage.isVisible(), "No se ve el mensaje del usuario");

  const assistantMessage = this.page.getByTestId("message-bubble-2");
  await assistantMessage.waitFor(visibleTimeout);
  assert.ok(await assistantMessage.isVisible(), "No se ve la respuesta del asistente");
});

When("selecciono nuevo chat", async function (this: CustomWorld) {
  const button = this.page.getByRole("button", { name: "Nuevo chat", exact: true });
  await button.waitFor(visibleTimeout);

  const detail = aAiConversationDetail({
    id: 3,
    title: "Nuevo problema detectado",
    messages: [
      anAiMessage({ id: 5, sender_role: "consumer", content: "Tengo un problema nuevo", created_on: "2026-06-18T10:10:00Z" }),
      anAiMessage({ id: 6, sender_role: "chatbot", content: "Por favor, describime el problema con más detalle.", created_on: "2026-06-18T10:10:05Z" }),
    ],
  });

  await this.stubPost("/chatbot/conversations", 201, detail);

  await button.click();
});

Then("se crea una nueva conversación", async function (this: CustomWorld) {
  const emptyTitle = this.page.getByRole("heading", { name: "Chat con IA", exact: true });
  await emptyTitle.waitFor(visibleTimeout);
  assert.ok(await emptyTitle.isVisible(), "No se muestra la pantalla de nueva conversación");
});

Then("puedo comenzar a enviar mensajes", async function (this: CustomWorld) {
  const input = this.page.getByPlaceholder("Escribe un mensaje...");
  await input.waitFor(visibleTimeout);
  assert.ok(await input.isVisible(), "No se muestra el input para enviar mensajes");

  await input.fill("Tengo un problema nuevo");
  const sendButton = this.page.getByRole("button", { name: "Enviar mensaje" });
  await sendButton.click();

  const newResponse = this.page.getByText("Por favor, describime el problema con más detalle.");
  await newResponse.waitFor(visibleTimeout);
});

Given("existe una conversación con la IA", async function (this: CustomWorld) {
  await this.setSession("consumer");

  const detail = aAiConversationDetail({
    id: 1,
    title: "Pérdida de agua en la cocina",
    messages: CONV_1_MESSAGES,
  });

  await this.stubGet("/conversations/1", detail);

  await this.page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?id=1`);
  await this.page.waitForLoadState("domcontentloaded");
});

When("recibo una nueva respuesta del asistente", async function (this: CustomWorld) {
  const messagesWithReply = [
    ...CONV_1_MESSAGES,
    anAiMessage({ id: 3, sender_role: "consumer", content: "Ya revisé y no es eso.", created_on: "2026-06-18T10:05:00Z" }),
    anAiMessage({ id: 4, sender_role: "chatbot", content: "Entonces podría ser la manguera de desagüe. ¿Podrías revisarla?", created_on: "2026-06-18T10:05:05Z" }),
  ];

  const detail = aAiConversationDetail({
    id: 1,
    title: "Pérdida de agua en la cocina",
    messages: messagesWithReply,
  });
  await this.stubPost("/chatbot/conversations/1/messages", 201, detail);

  const conv1 = aAiConversation({
    id: 1,
    title: "Pérdida de agua en la cocina",
    updated_on: "2026-06-18T10:05:05Z",
    last_message: anAiMessage({ id: 4, sender_role: "chatbot", content: "Entonces podría ser la manguera de desagüe. ¿Podrías revisarla?", created_on: "2026-06-18T10:05:05Z" }),
  });
  
  const conv2 = aAiConversation({
    id: 2,
    title: "Problema con el gas",
    updated_on: "2026-06-17T10:00:00Z",
    last_message: anAiMessage({ id: 4, sender_role: "consumer", content: "Huele a gas en la cocina", created_on: "2026-06-17T10:00:00Z" }),
  });

  await this.stubGet("/chatbot/conversations", [conv1, conv2]);
  await this.stubGet("/conversations/1", detail);

  const input = this.page.getByPlaceholder("Escribe un mensaje...");
  await input.fill("Ya revisé y no es eso.");

  const sendButton = this.page.getByRole("button", { name: "Enviar mensaje" });
  await sendButton.click();

  const chatArea = this.page.getByRole("region", { name: "Chat con el asistente de diagnóstico" });
  const newResponse = chatArea.getByText("Entonces podría ser la manguera de desagüe. ¿Podrías revisarla?");
  await newResponse.waitFor(visibleTimeout);
});

Then("la preview de la conversación se actualiza", async function (this: CustomWorld) {
  const sidebar = this.page.getByRole("list", { name: "Conversaciones con IA" });
  const updatedPreview = sidebar.getByText("Entonces podría ser la manguera de desagüe. ¿Podrías revisarla?");
  await updatedPreview.waitFor(visibleTimeout);
  assert.ok(await updatedPreview.isVisible(), "La preview no se actualizó");
});

Then("muestra el último mensaje recibido", async function (this: CustomWorld) {
  const chatArea = this.page.getByRole("region", { name: "Chat con el asistente de diagnóstico" });
  const lastMessage = chatArea.getByText("Entonces podría ser la manguera de desagüe. ¿Podrías revisarla?");
  assert.ok(await lastMessage.isVisible(), "El último mensaje no se muestra en el chat");
});
