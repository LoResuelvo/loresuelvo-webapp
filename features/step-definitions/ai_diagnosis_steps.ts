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
