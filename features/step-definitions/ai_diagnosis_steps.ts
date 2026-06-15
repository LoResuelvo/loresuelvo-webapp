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
  await page.waitForURL(`**${ROUTES.consumer.aiMessages}**`);
  assert.ok(
    page.url().includes(ROUTES.consumer.aiMessages),
    `Se esperaba estar en ${ROUTES.consumer.aiMessages} pero la URL es ${page.url()}`,
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
  await page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}`);
  await page.waitForLoadState("networkidle");
  const mensaje = "Se está filtrando agua debajo de la bacha";
  await page.evaluate((msg) => {
    const messages = [{
      id: `msg-user-${Date.now()}`,
      content: msg,
      senderId: "consumer-ai-diagnosis",
      sentAt: "Recién",
    }];
    localStorage.setItem("ai_chat_messages", JSON.stringify(messages));
  }, mensaje);
  await page.reload();
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
  await page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}`);
  await page.waitForLoadState("networkidle");
  const mensaje = "Se está filtrando agua debajo de la bacha";
  await page.evaluate((msg) => {
    const messages = [{
      id: `msg-user-${Date.now()}`,
      content: msg,
      senderId: "consumer-ai-diagnosis",
      sentAt: "Recién",
    }];
    localStorage.setItem("ai_chat_messages", JSON.stringify(messages));
  }, mensaje);
  await page.reload();
  await page.waitForLoadState("networkidle");
});

Given("envié un mensaje al asistente con un error simulado", async () => {
  await setConsumerSession();
  await page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?simulate=error`);
  await page.waitForLoadState("networkidle");
  const mensaje = "Se está filtrando agua debajo de la bacha";
  await page.evaluate((msg) => {
    const messages = [{
      id: `msg-user-${Date.now()}`,
      content: msg,
      senderId: "consumer-ai-diagnosis",
      sentAt: "Recién",
    }];
    localStorage.setItem("ai_chat_messages", JSON.stringify(messages));
  }, mensaje);
  await page.reload();
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

When("el servicio de IA no se encuentra disponible", async () => {
  // Ya navegamos con ?simulate=error en el Given. Sólo esperamos a que el
  // mensaje de error esté visible (controlado por el cliente mockeado).
  await page.getByText("No pudimos obtener una respuesta en este momento")
    .first()
    .waitFor({ state: "visible", timeout: 5000 });
});

Then("veo el mensaje del asistente {string}", async (expected: string) => {
  const element = page.getByText(expected).first();
  await element.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await element.isVisible(), `No se ve el mensaje "${expected}"`);
});

Then("puedo volver a intentarlo", async () => {
  const retry = page.getByRole("button", { name: /reintentar/i });
  await retry.waitFor({ state: "visible" });
  assert.ok(await retry.isVisible(), "No se ve el botón Reintentar");
});

When("visualizo la conversación con el asistente", async () => {
  await setConsumerSession();
  await page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}`);
  await page.waitForLoadState("networkidle");
  const mensaje = "Se está filtrando agua debajo de la bacha";
  await page.evaluate((msg) => {
    const messages = [{
      id: `msg-user-${Date.now()}`,
      content: msg,
      senderId: "consumer-ai-diagnosis",
      sentAt: "Recién",
    }];
    localStorage.setItem("ai_chat_messages", JSON.stringify(messages));
  }, mensaje);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByText("Se está filtrando agua debajo de la bacha").first()
    .waitFor({ state: "visible" });
});

When("selecciono la opción {string}", async (optionName: string) => {
  const option = page.getByRole("link", { name: new RegExp(optionName, "i") });
  await option.waitFor({ state: "visible" });
  await option.click();
  await page.waitForLoadState("networkidle");
});

Then("veo la pantalla de conversación con el asistente", async () => {
  await page.waitForURL(`**${ROUTES.consumer.aiMessages}**`);
  assert.ok(
    page.url().includes(ROUTES.consumer.aiMessages),
    `Se esperaba estar en ${ROUTES.consumer.aiMessages} pero la URL es ${page.url()}`,
  );

  const heading = page.getByRole("heading", { name: /chat con ia/i });
  await heading.waitFor({ state: "visible" });
  assert.ok(await heading.isVisible(), "No se ve la pantalla de conversación con el asistente");
});

Given("me encuentro escribiendo un mensaje para el asistente", async () => {
  await setConsumerSession();
  await page.goto(APP_URL + ROUTES.consumer.aiMessages);
  await page.waitForLoadState("networkidle");

  const input = page.getByPlaceholder(/escribe un mensaje/i);
  await input.waitFor({ state: "visible" });
});

When("el contenido supera una línea", async () => {
  const input = page.getByPlaceholder(/escribe un mensaje/i);
  await input.fill([
    "La bacha pierde agua",
    "También hay humedad debajo del mueble",
  ].join("\n"));
});

Then("el campo de texto aumenta su altura automáticamente", async () => {
  const input = page.getByPlaceholder(/escribe un mensaje/i);
  const rows = await input.evaluate((element) => (
    element instanceof HTMLTextAreaElement ? element.rows : 0
  ));

  assert.ok(rows > 1, `Se esperaba que el campo tenga más de una línea visible, pero tiene ${rows}`);
});

Then("permite visualizar hasta 6 líneas de contenido sin scroll", async () => {
  const input = page.getByPlaceholder(/escribe un mensaje/i);
  await input.fill([
    "Linea 1",
    "Linea 2",
    "Linea 3",
    "Linea 4",
    "Linea 5",
    "Linea 6",
  ].join("\n"));

  const state = await input.evaluate((element) => {
    if (!(element instanceof HTMLTextAreaElement)) {
      return { rows: 0, overflowY: "" };
    }

    return {
      rows: element.rows,
      overflowY: window.getComputedStyle(element).overflowY,
    };
  });

  assert.equal(state.rows, 6, `Se esperaban 6 líneas visibles, pero hay ${state.rows}`);
  assert.equal(state.overflowY, "hidden", "No debería haber scroll interno hasta 6 líneas");
});

When("el contenido supera las 6 líneas visibles", async () => {
  const input = page.getByPlaceholder(/escribe un mensaje/i);
  await input.fill([
    "Linea 1",
    "Linea 2",
    "Linea 3",
    "Linea 4",
    "Linea 5",
    "Linea 6",
    "Linea 7 que supera el límite",
  ].join("\n"));
});

Then("el campo de texto mantiene una altura máxima de 6 líneas", async () => {
  const input = page.getByPlaceholder(/escribe un mensaje/i);
  const state = await input.evaluate((element) => {
    if (!(element instanceof HTMLTextAreaElement)) {
      return { rows: 0, clientHeight: 0, scrollHeight: 0 };
    }
    return {
      rows: element.rows,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    };
  });

  const maxExpectedHeight = 50 * 6;
  assert.equal(state.rows, 6, `Se esperaban 6 filas, pero hay ${state.rows}`);
  assert.ok(
    state.clientHeight <= maxExpectedHeight,
    `La altura visible debería ser máximo ${maxExpectedHeight}px, pero es ${state.clientHeight}px`,
  );
});

Then("puedo desplazarme mediante scroll dentro del campo", async () => {
  const input = page.getByPlaceholder(/escribe un mensaje/i);
  const overflowY = await input.evaluate((element) =>
    element instanceof HTMLTextAreaElement
      ? window.getComputedStyle(element).overflowY
      : "",
  );
  assert.equal(overflowY, "auto", `Se esperaba overflow-y: auto, pero es ${overflowY}`);
});

Then("el contenido completo permanece accesible", async () => {
  const input = page.getByPlaceholder(/escribe un mensaje/i);
  const scrollHeight = await input.evaluate((element) =>
    element instanceof HTMLTextAreaElement ? element.scrollHeight : 0,
  );
  const clientHeight = await input.evaluate((element) =>
    element instanceof HTMLTextAreaElement ? element.clientHeight : 0,
  );
  assert.ok(
    scrollHeight > clientHeight,
    `El contenido debería exceder la altura visible (scrollHeight: ${scrollHeight}, clientHeight: ${clientHeight})`,
  );
});
