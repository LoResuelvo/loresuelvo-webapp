import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { page } from "./landing_page_visualization_steps";
import { ROUTES } from "../../lib/routes";
import { addApiStub, hasApiStub } from "./stubs-helper";
import { setConsumerSession } from "./initiate_chat_with_provider_steps";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

Given("estoy autenticado como consumidor", async () => {
  await setConsumerSession();
});

Given("me encuentro en la pantalla Home", async () => {
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

  await page.goto(APP_URL + ROUTES.consumer.home);
  await page.waitForLoadState("networkidle");
});

When("ingreso un mensaje en el campo de diagnóstico", async () => {
  const input = page.getByPlaceholder(/describe el problema/i);
  await input.waitFor({ state: "visible" });
  await input.fill("Se está filtrando agua debajo de la bacha");
});

When("presiono {string}", async (buttonName: string) => {
  const button = page.getByRole("button", { name: new RegExp(buttonName, "i") }).first();
  await button.waitFor({ state: "visible" });
  await button.click();
  await page.waitForLoadState("networkidle");
});

Then("se inicia una conversación con el asistente", async () => {
  await page.waitForURL(`**${ROUTES.consumer.diagnostico}**`);
  assert.ok(
    page.url().includes(ROUTES.consumer.diagnostico),
    `Se esperaba estar en ${ROUTES.consumer.diagnostico} pero la URL es ${page.url()}`,
  );
});

Then("veo mi mensaje en el chat", async () => {
  const myMessage = page.getByText("Se está filtrando agua debajo de la bacha").first();
  await myMessage.waitFor({ state: "visible" });
  assert.ok(
    await myMessage.isVisible(),
    "No se ve el mensaje del usuario en el chat",
  );
});

Given("inicié una conversación con el asistente", async () => {
  await setConsumerSession();
  const mensaje = encodeURIComponent("Se está filtrando agua debajo de la bacha");
  await page.goto(`${APP_URL}${ROUTES.consumer.diagnostico}?mensaje=${mensaje}`);
  await page.waitForLoadState("networkidle");
});

When("el asistente procesa mi mensaje", async () => {
  // El procesamiento está modelado con un delay client-side (mock de IA).
  // Esperamos a que la respuesta del asistente aparezca en el chat.
  await page.getByText(
    "Entiendo. ¿La pérdida ocurre de forma constante o solamente cuando utilizas la canilla?",
  ).first().waitFor({ state: "visible", timeout: 5000 });
});

Then("veo una respuesta del asistente en el chat", async () => {
  const reply = page.getByText(
    "Entiendo. ¿La pérdida ocurre de forma constante o solamente cuando utilizas la canilla?",
  ).first();
  await reply.waitFor({ state: "visible" });
  assert.ok(
    await reply.isVisible(),
    "No se ve la respuesta del asistente en el chat",
  );
});

Given("envié un mensaje al asistente", async () => {
  await setConsumerSession();
  const mensaje = encodeURIComponent("Se está filtrando agua debajo de la bacha");
  await page.goto(`${APP_URL}${ROUTES.consumer.diagnostico}?mensaje=${mensaje}`);
  await page.waitForLoadState("networkidle");
});

When("la respuesta aún se encuentra en procesamiento", async () => {
  // El cliente mock tiene un delay por defecto (800ms). Verificamos el indicador
  // antes de que la respuesta del asistente aparezca.
  await page.getByRole("status", { name: /asistente escribiendo/i })
    .waitFor({ state: "visible", timeout: 2000 });
});

Then("veo un indicador de carga", async () => {
  const indicator = page.getByRole("status", { name: /asistente escribiendo/i });
  await indicator.waitFor({ state: "visible" });
  assert.ok(await indicator.isVisible(), "No se ve el indicador de carga");
});

Then("no puedo enviar un nuevo mensaje hasta recibir una respuesta", async () => {
  const input = page.getByPlaceholder(/escribe un mensaje/i);
  const sendButton = page.getByRole("button", { name: /enviar mensaje/i });
  await input.waitFor({ state: "visible" });
  assert.ok(await input.isDisabled(), "El input debería estar deshabilitado durante el procesamiento");
  assert.ok(await sendButton.isDisabled(), "El botón enviar debería estar deshabilitado durante el procesamiento");
});
