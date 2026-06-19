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

Then("veo el apartado {string}", async (optionName: string) => {
  const option = page
    .getByRole("navigation", { name: "Navegación del consumidor" })
    .getByRole("link", { name: optionName });
  await option.waitFor({ state: "visible" });
  assert.ok(await option.isVisible(), `No se visualiza la opción "${optionName}"`);
});

Given("ingreso a la sección {string}", async (sectionName: string) => {
  await setConsumerSession();

  if (sectionName === "Chat con IA") {
    if (!await hasApiStub("GET", "/chatbot/conversations")) {
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
    }

    if (!await hasApiStub("GET", "/conversations/1")) {
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
    }
  }

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
