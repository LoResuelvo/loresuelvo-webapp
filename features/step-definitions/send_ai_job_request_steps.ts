import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { page } from "./landing_page_visualization_steps";
import { ROUTES } from "../../lib/routes";
import { addApiStub } from "./stubs-helper";
import { setConsumerSession } from "./initiate_chat_with_provider_steps";

const APP_URL = process.env.APP_URL || "http://localhost:3000";


Given("la evaluación del chatbot todavía requiere más información", async () => {
  await setConsumerSession();

  await addApiStub({
    method: "GET",
    endpoint: "/chatbot/conversations",
    status: 200,
    body: [
      {
        id: 1,
        status: "active",
        title: "Pérdida de agua",
        last_message: {
          id: 2,
          sender_role: "chatbot",
          content: "¿Podrías describir con más detalle dónde se produce la pérdida?",
          created_on: "2026-06-18T10:00:01Z",
        },
        updated_on: "2026-06-18T10:00:01Z",
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
      title: "Pérdida de agua",
      response_status: "answered",
      assessment: {
        outcome: "collecting_information",
      },
      messages: [
        {
          id: 1,
          sender_role: "consumer",
          content: "Hay un problema con el agua",
          created_on: "2026-06-18T10:00:00Z",
        },
        {
          id: 2,
          sender_role: "chatbot",
          content: "¿Podrías describir con más detalle dónde se produce la pérdida?",
          created_on: "2026-06-18T10:00:01Z",
        },
      ],
      recommended_providers: [],
    },
  });

  await page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?id=1`);
  await page.waitForLoadState("networkidle");
});

Given("la evaluación del chatbot determina que el problema puede resolverse sin profesional", async () => {
  await setConsumerSession();

  await addApiStub({
    method: "GET",
    endpoint: "/chatbot/conversations",
    status: 200,
    body: [
      {
        id: 1,
        status: "active",
        title: "Canilla que gotea",
        last_message: {
          id: 2,
          sender_role: "chatbot",
          content: "Podés resolverlo vos mismo ajustando el cuerito de la canilla.",
          created_on: "2026-06-18T10:00:01Z",
        },
        updated_on: "2026-06-18T10:00:01Z",
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
      title: "Canilla que gotea",
      response_status: "answered",
      assessment: {
        outcome: "self_service",
        problem_category: {
          id: 1,
          name: "Plomería",
        },
      },
      messages: [
        {
          id: 1,
          sender_role: "consumer",
          content: "La canilla gotea",
          created_on: "2026-06-18T10:00:00Z",
        },
        {
          id: 2,
          sender_role: "chatbot",
          content: "Podés resolverlo vos mismo ajustando el cuerito de la canilla.",
          created_on: "2026-06-18T10:00:01Z",
        },
      ],
      recommended_providers: [],
    },
  });

  await page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?id=1`);
  await page.waitForLoadState("networkidle");
});

Given("el servicio de solicitudes de trabajo no está disponible", async () => {
  await page.route("**/chatbot/conversations/1/job-requests", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Internal Server Error" }),
    });
  });
});

Given("ya existe una solicitud de trabajo abierta con {string}", async (providerName: string) => {
  await page.route("**/chatbot/conversations/1/job-requests", async (route) => {
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        error: `Ya existe una solicitud de trabajo abierta con ${providerName}`,
      }),
    });
  });
});


When("hago clic en {string} del prestador recomendado {string}", async (buttonText: string, providerName: string) => {
  const providerCard = page.locator("[data-testid='recommended-provider']")
    .filter({ hasText: providerName })
    .first();
  await providerCard.waitFor({ state: "visible" });

  const button = providerCard.getByRole("button", { name: new RegExp(buttonText, "i") });
  await button.waitFor({ state: "visible" });
  await button.click();
});


Then("cada prestador recomendado muestra un botón {string}", async (buttonText: string) => {
  const providerCards = page.locator("[data-testid='recommended-provider']");
  const count = await providerCards.count();
  assert.ok(count > 0, "No se encontraron prestadores recomendados");

  for (let i = 0; i < count; i++) {
    const button = providerCards.nth(i).getByRole("button", { name: new RegExp(buttonText, "i") });
    await button.waitFor({ state: "visible" });
    assert.ok(await button.isVisible(), `El prestador ${i + 1} no tiene botón "${buttonText}"`);
  }
});

Then("el sistema envía la solicitud de trabajo al prestador {string}", async (providerName: string) => {
  const successMessage = page.getByText(new RegExp(`solicitud.*enviada|contactar.*${providerName}`, "i")).first();
  await successMessage.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await successMessage.isVisible(), `No se confirmó el envío de la solicitud a ${providerName}`);
});

Then("veo una confirmación de que la solicitud fue enviada", async () => {
  const confirmation = page.getByText(/solicitud.*enviada/i).first();
  await confirmation.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await confirmation.isVisible(), "No se ve la confirmación de envío");
});

Then("soy redirigido a la conversación de trabajo con {string}", async (providerName: string) => {
  await page.waitForURL(`**${ROUTES.consumer.messages}**`, { timeout: 5000 });
  assert.ok(
    page.url().includes(ROUTES.consumer.messages),
    `Se esperaba redirección a ${ROUTES.consumer.messages} pero la URL es ${page.url()}`,
  );
});

Then("veo un mensaje de error indicando que no se pudo enviar la solicitud", async () => {
  const errorMessage = page.getByText(/no se pudo enviar|error al enviar|no pudimos/i).first();
  await errorMessage.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await errorMessage.isVisible(), "No se muestra el mensaje de error");
});

Then("veo un mensaje indicando que ya existe una solicitud abierta con ese prestador", async () => {
  const duplicateMessage = page.getByText(/ya existe una solicitud/i).first();
  await duplicateMessage.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await duplicateMessage.isVisible(), "No se muestra el mensaje de solicitud duplicada");
});
