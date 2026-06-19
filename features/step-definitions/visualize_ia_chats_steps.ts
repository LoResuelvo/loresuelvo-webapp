import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { page } from "./landing_page_visualization_steps";
import { setConsumerSession } from "./initiate_chat_with_provider_steps";
import { ROUTES } from "../../lib/routes";
import { addApiStub, hasApiStub } from "./stubs-helper";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

When("visualizo el sidebar", async () => {
  await setConsumerSession();

  if (!await hasApiStub("GET", "/categories")) {
    await addApiStub({
      method: "GET",
      endpoint: "/categories",
      status: 200,
      body: [
        { id: 1, name: "Plomería" },
        { id: 2, name: "Electricista" },
      ],
    });
  }

  await page.goto(`${APP_URL}${ROUTES.consumer.home}`, { waitUntil: "networkidle", timeout: 15000 });

  const sidebar = page.getByRole("navigation", {
    name: "Navegación del consumidor",
  });
  await sidebar.waitFor({ state: "visible", timeout: 15000 });
  assert.ok(await sidebar.isVisible(), "No se visualiza el sidebar");
});

Then("veo el apartado Chat con IA", async () => {
  const option = page
    .getByRole("navigation", { name: "Navegación del consumidor" })
    .getByRole("link", { name: "Chat con IA" });
  await option.waitFor({ state: "visible" });
  assert.ok(await option.isVisible(), `No se visualiza la opción "Chat con IA"`);
});

Given("ingreso a la sección Chat con IA", async()=> {
  await setConsumerSession();

  await addApiStub({
    method: "GET",
    endpoint: "/chatbot/conversations",
    status: 200,
    body: [
      {
        id: 1,
        status: "active",
        title: "Pérdida de agua en la cocina",
        last_message: {
          id: 2,
          sender_role: "chatbot",
          content: "Revisá si el agua sale desde la rosca del sifón.",
          created_on: "2026-06-18T12:00:00Z",
        },
        updated_on: "2026-06-18T12:00:00Z",
      },
      {
        id: 2,
        status: "active",
        title: "Problema con el gas",
        last_message: {
          id: 4,
          sender_role: "consumer",
          content: "Huele a gas en la cocina",
          created_on: "2026-06-17T10:00:00Z",
        },
        updated_on: "2026-06-17T10:00:00Z",
      },
    ],
  });

  await addApiStub({
    method: "GET",
    endpoint: "/conversations/1",
    status: 200,
    body: {
      id: 1,
      conversation_id: 1,
      status: "active",
      title: "Pérdida de agua en la cocina",
      response_status: "answered",
      messages: [
        {
          id: 1,
          sender_role: "consumer",
          content: "Se está filtrando agua debajo de la bacha",
          created_on: "2026-06-18T10:00:00Z",
        },
        {
          id: 2,
          sender_role: "chatbot",
          content: "Revisá si el agua sale desde la rosca del sifón.",
          created_on: "2026-06-18T10:00:01Z",
        },
      ],
      response: {
        id: 2,
        sender_role: "chatbot",
        content: "Revisá si el agua sale desde la rosca del sifón.",
        created_on: "2026-06-18T10:00:01Z",
      },
      recommended_providers: [],
    },
  });

  await page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}`);
  await page.waitForLoadState("domcontentloaded");
});

Then("veo mis conversaciones anteriores con la IA", async () => {
  const conversation = page.getByText("Pérdida de agua en la cocina");
  await conversation.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await conversation.isVisible(), "No se ve la conversación");
});

Then("cada conversación muestra un título", async () => {
  const title = page.getByText("Pérdida de agua en la cocina");
  await title.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await title.isVisible(), "No se ve el título de la conversación");
});

Then("cada conversación muestra una preview del último mensaje intercambiado", async () => {
  const preview = page.getByText("Revisá si el agua sale desde la rosca del sifón.");
  await preview.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await preview.isVisible(), "No se ve la preview del mensaje");
});

When("selecciono una conversación existente", async () => {
  await page.getByText("Pérdida de agua en la cocina").click();
  await page.waitForLoadState("domcontentloaded");
});

Then("veo el historial completo de mensajes de esa conversación", async () => {
  const userMessage = page.getByTestId("message-bubble-1");
  await userMessage.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await userMessage.isVisible(), "No se ve el mensaje del usuario");

  const assistantMessage = page.getByTestId("message-bubble-2");
  await assistantMessage.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await assistantMessage.isVisible(), "No se ve la respuesta del asistente");
});

When("selecciono nuevo chat", async () => {
  const button = page.getByRole("button", { name: "Nuevo chat", exact: true });
  await button.waitFor({ state: "visible", timeout: 5000 });
  
  await addApiStub({
    method: "POST",
    endpoint: "/chatbot/conversations",
    status: 201,
    body: {
      id: 3,
      conversation_id: 3,
      status: "active",
      title: "Nuevo problema detectado",
      response_status: "answered",
      messages: [
        {
          id: 5,
          sender_role: "consumer",
          content: "Tengo un problema nuevo",
          created_on: "2026-06-18T10:10:00Z",
        },
        {
          id: 6,
          sender_role: "chatbot",
          content: "Por favor, describime el problema con más detalle.",
          created_on: "2026-06-18T10:10:05Z",
        }
      ],
      response: {
        id: 6,
        sender_role: "chatbot",
        content: "Por favor, describime el problema con más detalle.",
        created_on: "2026-06-18T10:10:05Z",
      },
      recommended_providers: [],
    },
  });

  await button.click();
});

Then("se crea una nueva conversación", async () => {
  const emptyTitle = page.getByRole("heading", { name: "Chat con IA", exact: true });
  await emptyTitle.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await emptyTitle.isVisible(), "No se muestra la pantalla de nueva conversación");
});

Then("puedo comenzar a enviar mensajes", async () => {
  const input = page.getByPlaceholder("Escribe un mensaje...");
  await input.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await input.isVisible(), "No se muestra el input para enviar mensajes");
  
  await input.fill("Tengo un problema nuevo");
  const sendButton = page.getByRole("button", { name: "Enviar mensaje" });
  await sendButton.click();
  
  const newResponse = page.getByText("Por favor, describime el problema con más detalle.");
  await newResponse.waitFor({ state: "visible", timeout: 5000 });
});

Given("existe una conversación con la IA", async () => {
  await setConsumerSession();
  
  await addApiStub({
    method: "GET",
    endpoint: "/conversations/1",
    status: 200,
    body: {
      id: 1,
      conversation_id: 1,
      status: "active",
      title: "Pérdida de agua en la cocina",
      response_status: "answered",
      messages: [
        {
          id: 1,
          sender_role: "consumer",
          content: "Se está filtrando agua debajo de la bacha",
          created_on: "2026-06-18T10:00:00Z",
        },
        {
          id: 2,
          sender_role: "chatbot",
          content: "Revisá si el agua sale desde la rosca del sifón.",
          created_on: "2026-06-18T10:00:01Z",
        },
      ],
      response: {
        id: 2,
        sender_role: "chatbot",
        content: "Revisá si el agua sale desde la rosca del sifón.",
        created_on: "2026-06-18T10:00:01Z",
      },
      recommended_providers: [],
    },
  });

  await page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?id=1`);
  await page.waitForLoadState("domcontentloaded");
});

When("recibo una nueva respuesta del asistente", async () => {
  await addApiStub({
    method: "POST",
    endpoint: "/chatbot/conversations/1/messages",
    status: 201,
    body: {
      id: 1,
      conversation_id: 1,
      status: "active",
      title: "Pérdida de agua en la cocina",
      response_status: "answered",
      messages: [
        {
          id: 1,
          sender_role: "consumer",
          content: "Se está filtrando agua debajo de la bacha",
          created_on: "2026-06-18T10:00:00Z",
        },
        {
          id: 2,
          sender_role: "chatbot",
          content: "Revisá si el agua sale desde la rosca del sifón.",
          created_on: "2026-06-18T10:00:01Z",
        },
        {
          id: 3,
          sender_role: "consumer",
          content: "Ya revisé y no es eso.",
          created_on: "2026-06-18T10:05:00Z",
        },
        {
          id: 4,
          sender_role: "chatbot",
          content: "Entonces podría ser la manguera de desagüe. ¿Podrías revisarla?",
          created_on: "2026-06-18T10:05:05Z",
        }
      ],
      response: {
        id: 4,
        sender_role: "chatbot",
        content: "Entonces podría ser la manguera de desagüe. ¿Podrías revisarla?",
        created_on: "2026-06-18T10:05:05Z",
      },
      recommended_providers: [],
    },
  });

  await addApiStub({
    method: "GET",
    endpoint: "/chatbot/conversations",
    status: 200,
    body: [
      {
        id: 1,
        status: "active",
        title: "Pérdida de agua en la cocina",
        last_message: {
          id: 4,
          sender_role: "chatbot",
          content: "Entonces podría ser la manguera de desagüe. ¿Podrías revisarla?",
          created_on: "2026-06-18T10:05:05Z",
        },
        updated_on: "2026-06-18T10:05:05Z",
      },
      {
        id: 2,
        status: "active",
        title: "Problema con el gas",
        last_message: {
          id: 4,
          sender_role: "consumer",
          content: "Huele a gas en la cocina",
          created_on: "2026-06-17T10:00:00Z",
        },
        updated_on: "2026-06-17T10:00:00Z",
      },
    ],
  });

  await addApiStub({
    method: "GET",
    endpoint: "/conversations/1",
    status: 200,
    body: {
      id: 1,
      conversation_id: 1,
      status: "active",
      title: "Pérdida de agua en la cocina",
      response_status: "answered",
      messages: [
        {
          id: 1,
          sender_role: "consumer",
          content: "Se está filtrando agua debajo de la bacha",
          created_on: "2026-06-18T10:00:00Z",
        },
        {
          id: 2,
          sender_role: "chatbot",
          content: "Revisá si el agua sale desde la rosca del sifón.",
          created_on: "2026-06-18T10:00:01Z",
        },
        {
          id: 3,
          sender_role: "consumer",
          content: "Ya revisé y no es eso.",
          created_on: "2026-06-18T10:05:00Z",
        },
        {
          id: 4,
          sender_role: "chatbot",
          content: "Entonces podría ser la manguera de desagüe. ¿Podrías revisarla?",
          created_on: "2026-06-18T10:05:05Z",
        }
      ],
      response: {
        id: 4,
        sender_role: "chatbot",
        content: "Entonces podría ser la manguera de desagüe. ¿Podrías revisarla?",
        created_on: "2026-06-18T10:05:05Z",
      },
      recommended_providers: [],
    },
  });

  const input = page.getByPlaceholder("Escribe un mensaje...");
  await input.fill("Ya revisé y no es eso.");
  
  const sendButton = page.getByRole("button", { name: "Enviar mensaje" });
  await sendButton.click();
  
  const newResponse = page.getByText("Entonces podría ser la manguera de desagüe. ¿Podrías revisarla?");
  await newResponse.waitFor({ state: "visible", timeout: 5000 });
});

Then("la preview de la conversación se actualiza", async () => {
  const sidebar = page.getByRole("list", { name: "Conversaciones con IA" });
  const updatedPreview = sidebar.getByText("Entonces podría ser la manguera de desagüe. ¿Podrías revisarla?");
  await updatedPreview.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await updatedPreview.isVisible(), "La preview no se actualizó");
});

Then("muestra el último mensaje recibido", async () => {
  const chatArea = page.getByRole("region", { name: "Chat con el asistente de diagnóstico" });
  const lastMessage = chatArea.getByText("Entonces podría ser la manguera de desagüe. ¿Podrías revisarla?");
  assert.ok(await lastMessage.isVisible(), "El último mensaje no se muestra en el chat");
});
