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

  if (sectionName === "Chat con IA" && !await hasApiStub("GET", "/chatbot/conversations")) {
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

  await page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}`);
  await page.waitForLoadState("domcontentloaded");
});

Then("veo mis conversaciones anteriores con la IA", async () => {
  const conversation = page.getByText("Pérdida de agua en la cocina");
  await conversation.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await conversation.isVisible(), "No se ve la conversación");
});
