import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, APP_URL, visibleTimeout, attachedTimeout, waitTimeout, attachedState } from "../support/world";
import { ROUTES } from "../../lib/routes";
import { aAiConversation, aAiConversationDetail, aCategory, aJobRequest, aProvider, anAiMessage, anApiError } from "../support/factories";

const PROMPT_REPLY = "Entiendo. ¿La pérdida ocurre de forma constante o solamente cuando utilizas la canilla?";
const ADVISORY_MSG = "Las respuestas brindadas son una orientación preliminar y no constituyen un diagnóstico técnico definitivo";
const DIAG_EXPLANATION = "El problema es una fuga. Te sugiero un plomero.";

Given("estoy autenticado como consumidor", async function (this: CustomWorld) {
  await this.setSession("consumer");
});

Given("me encuentro en la pantalla Home", async function (this: CustomWorld) {
  await this.setSession("consumer");

  if (!(await this.hasApiStub("GET", "/categories"))) {
    await this.stubGet("/categories", [
      aCategory({ id: 1, name: "Plomería" }),
      aCategory({ id: 2, name: "Electricista" }),
    ]);
  }

  if (!(await this.hasApiStub("POST", "/chatbot/conversations"))) {
    await this.stubPost("/chatbot/conversations", 200, aAiConversationDetail());
  }
  if (!(await this.hasApiStub("GET", "/chatbot/conversations"))) {
    await this.stubGet("/chatbot/conversations", [aAiConversation()]);
  }
  if (!(await this.hasApiStub("GET", "/conversations/1"))) {
    await this.stubGet("/conversations/1", aAiConversationDetail());
  }

  await this.page.goto(APP_URL + ROUTES.consumer.home);
  await this.page.waitForLoadState("networkidle");
});

When("ingreso un mensaje en el campo de diagnóstico", async function (this: CustomWorld) {
  const input = this.page.getByPlaceholder(/describe el problema/i);
  await input.waitFor();
  await input.fill("Se está filtrando agua debajo de la bacha");
});

When("presiono {string}", async function (this: CustomWorld, buttonName: string) {
  const button = this.page.getByRole("button", { name: new RegExp(buttonName, "i") }).first();
  await button.waitFor();
  await button.click();
  await this.page.waitForLoadState("networkidle");
});

Then("se inicia una conversación con el asistente", async function (this: CustomWorld) {
  await this.page.waitForURL(`**${ROUTES.consumer.aiMessages}**`);
  assert.ok(
    this.page.url().includes(ROUTES.consumer.aiMessages),
    `Se esperaba estar en ${ROUTES.consumer.aiMessages} pero la URL es ${this.page.url()}`
  );
});

Then("veo mi mensaje en el chat", async function (this: CustomWorld) {
  const myMessage = this.page.getByText("Se está filtrando agua debajo de la bacha").first();
  await myMessage.waitFor();
  assert.ok(await myMessage.isVisible(), "No se ve el mensaje del usuario en el chat");
});

Given("inicié una conversación con el asistente", async function (this: CustomWorld) {
  await this.setSession("consumer");

  const detail = aAiConversationDetail({
    messages: [
      anAiMessage({ id: 1, sender_role: "consumer", content: "Se está filtrando agua debajo de la bacha", created_on: "2026-06-18T10:00:00Z" }),
      anAiMessage({ id: 2, sender_role: "chatbot", content: PROMPT_REPLY, created_on: "2026-06-18T10:00:01Z" }),
    ],
  });

  await this.stubGet("/chatbot/conversations", [
    aAiConversation({
      last_message: anAiMessage({ id: 2, sender_role: "chatbot", content: PROMPT_REPLY, created_on: "2026-06-18T10:00:01Z" }),
    }),
  ]);
  await this.stubPost("/chatbot/conversations", 200, detail);
  await this.stubGet("/conversations/1", detail);

  await this.page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?id=1`);
  await this.page.waitForLoadState("networkidle");
});

When("el asistente procesa mi mensaje", async function (this: CustomWorld) {
  await this.page.getByText(PROMPT_REPLY).first().waitFor(visibleTimeout);
});

Then("veo una respuesta del asistente en el chat", async function (this: CustomWorld) {
  const reply = this.page.getByText(PROMPT_REPLY).first();
  await reply.waitFor();
  assert.ok(await reply.isVisible(), "No se ve la respuesta del asistente en el chat");
});

Given("estoy en una conversación con el asistente", async function (this: CustomWorld) {
  await this.setSession("consumer");

  if (!(await this.hasApiStub("GET", "/chatbot/conversations"))) {
    await this.stubGet("/chatbot/conversations", [aAiConversation()]);
  }
  if (!(await this.hasApiStub("GET", "/conversations/1"))) {
    await this.stubGet("/conversations/1", aAiConversationDetail({ response_status: "pending" }));
  }

  await this.page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?id=1`);
  await this.page.waitForLoadState("networkidle");
});

When("envío un nuevo mensaje y la respuesta tarda en llegar", async function (this: CustomWorld) {
  await this.stubPost("/chatbot/conversations/1/messages", 200, aAiConversationDetail());
  let delayed = false;
  await this.page.route("**/consumidor/mensajes-ia*", async (route) => {
    if (route.request().method() === "POST" && !delayed) {
      delayed = true;
      await new Promise((resolve) => setTimeout(resolve, 7000));
    }
    await route.fallback();
  });

  const input = this.page.getByPlaceholder(/escribe un mensaje/i);
  await input.fill("Sigue perdiendo agua");
  const sendButton = this.page.getByRole("button", { name: /enviar mensaje/i });
  await sendButton.click();
});

When("envío un nuevo mensaje y el servicio falla", async function (this: CustomWorld) {
  await this.stubPost("/chatbot/conversations/1/messages", 500, anApiError("Internal Server Error"));

  const input = this.page.getByPlaceholder(/escribe un mensaje/i);
  await input.fill("Sigue perdiendo agua");
  const sendButton = this.page.getByRole("button", { name: /enviar mensaje/i });
  await sendButton.click();
});

Then("veo un indicador de carga", async function (this: CustomWorld) {
  const indicator = this.page.getByRole("status", { name: /asistente escribiendo/i });
  await indicator.waitFor();
  assert.ok(await indicator.isVisible(), "No se ve el indicador de carga");
});

Then("no puedo enviar un nuevo mensaje hasta recibir una respuesta", async function (this: CustomWorld) {
  const input = this.page.getByPlaceholder(/escribe un mensaje/i);
  const sendButton = this.page.getByRole("button", { name: /enviar mensaje/i });
  await input.waitFor();
  assert.ok(await input.isDisabled(), "El input debería estar deshabilitado durante el procesamiento");
  assert.ok(await sendButton.isDisabled(), "El botón enviar debería estar deshabilitado durante el procesamiento");
});

Then("veo el mensaje del asistente {string}", async function (this: CustomWorld, expected: string) {
  const element = this.page.getByText(expected).first();
  await element.waitFor(visibleTimeout);
  assert.ok(await element.isVisible(), `No se ve el mensaje "${expected}"`);
});

Then("puedo volver a intentarlo", async function (this: CustomWorld) {
  const retry = this.page.getByRole("button", { name: /reintentar/i });
  await retry.waitFor();
  assert.ok(await retry.isVisible(), "No se ve el botón Reintentar");
});

When("visualizo la conversación con el asistente", async function (this: CustomWorld) {
  await this.setSession("consumer");

  if (!(await this.hasApiStub("GET", "/chatbot/conversations"))) {
    await this.stubGet("/chatbot/conversations", [
      aAiConversation({
        last_message: anAiMessage({ id: 2, sender_role: "chatbot", content: ADVISORY_MSG, created_on: "2026-06-18T10:00:01Z" }),
      }),
    ]);
  }
  if (!(await this.hasApiStub("GET", "/conversations/1"))) {
    await this.stubGet("/conversations/1", aAiConversationDetail({
      messages: [
        anAiMessage({ id: 1, sender_role: "consumer", content: "Se está filtrando agua debajo de la bacha", created_on: "2026-06-18T10:00:00Z" }),
        anAiMessage({ id: 2, sender_role: "chatbot", content: ADVISORY_MSG, created_on: "2026-06-18T10:00:01Z" }),
      ],
    }));
  }

  await this.page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?id=1`);
  await this.page.waitForLoadState("networkidle");
});

When("selecciono la opción {string}", async function (this: CustomWorld, optionName: string) {
  const option = this.page.getByRole("link", { name: new RegExp(optionName, "i") });
  await option.waitFor();
  await option.click();
  await this.page.waitForLoadState("networkidle");
});

Then("veo la pantalla de conversación con el asistente", async function (this: CustomWorld) {
  await this.page.waitForURL(`**${ROUTES.consumer.aiMessages}**`);
  assert.ok(
    this.page.url().includes(ROUTES.consumer.aiMessages),
    `Se esperaba estar en ${ROUTES.consumer.aiMessages} pero la URL es ${this.page.url()}`
  );

  const heading = this.page.getByRole("heading", { name: /chat con ia/i });
  await heading.waitFor();
  assert.ok(await heading.isVisible(), "No se ve la pantalla de conversación con el asistente");
});

Given("me encuentro escribiendo un mensaje para el asistente", async function (this: CustomWorld) {
  await this.setSession("consumer");
  await this.page.goto(APP_URL + ROUTES.consumer.aiMessages);
  await this.page.waitForLoadState("networkidle");

  const input = this.page.getByPlaceholder(/escribe un mensaje/i);
  await input.waitFor();
});

When("el contenido supera una línea", async function (this: CustomWorld) {
  const input = this.page.getByPlaceholder(/escribe un mensaje/i);
  await input.fill(["La bacha pierde agua", "También hay humedad debajo del mueble"].join("\n"));
});

Then("el campo de texto aumenta su altura automáticamente", async function (this: CustomWorld) {
  const input = this.page.getByPlaceholder(/escribe un mensaje/i);
  const rows = await input.evaluate((element) => (element instanceof HTMLTextAreaElement ? element.rows : 0));
  assert.ok(rows > 1, `Se esperaba que el campo tenga más de una línea visible, pero tiene ${rows}`);
});

Then("permite visualizar hasta 6 líneas de contenido sin scroll", async function (this: CustomWorld) {
  const input = this.page.getByPlaceholder(/escribe un mensaje/i);
  await input.fill(["Linea 1", "Linea 2", "Linea 3", "Linea 4", "Linea 5", "Linea 6"].join("\n"));

  const state = await input.evaluate((element) => {
    if (!(element instanceof HTMLTextAreaElement)) return { rows: 0, overflowY: "" };
    return { rows: element.rows, overflowY: window.getComputedStyle(element).overflowY };
  });

  assert.equal(state.rows, 6, `Se esperaban 6 líneas visibles, pero hay ${state.rows}`);
  assert.equal(state.overflowY, "hidden", "No debería haber scroll interno hasta 6 líneas");
});

When("el contenido supera las 6 líneas visibles", async function (this: CustomWorld) {
  const input = this.page.getByPlaceholder(/escribe un mensaje/i);
  await input.fill(
    ["Linea 1", "Linea 2", "Linea 3", "Linea 4", "Linea 5", "Linea 6", "Linea 7 que supera el límite"].join("\n")
  );
});

Then("el campo de texto mantiene una altura máxima de 6 líneas", async function (this: CustomWorld) {
  const input = this.page.getByPlaceholder(/escribe un mensaje/i);
  const state = await input.evaluate((element) => {
    if (!(element instanceof HTMLTextAreaElement)) return { rows: 0, clientHeight: 0, scrollHeight: 0 };
    return { rows: element.rows, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight };
  });

  const maxExpectedHeight = 50 * 6;
  assert.equal(state.rows, 6, `Se esperaban 6 filas, pero hay ${state.rows}`);
  assert.ok(
    state.clientHeight <= maxExpectedHeight,
    `La altura visible debería ser máximo ${maxExpectedHeight}px, pero es ${state.clientHeight}px`
  );
});

Then("puedo desplazarme mediante scroll dentro del campo", async function (this: CustomWorld) {
  const input = this.page.getByPlaceholder(/escribe un mensaje/i);
  const overflowY = await input.evaluate((element) =>
    element instanceof HTMLTextAreaElement ? window.getComputedStyle(element).overflowY : ""
  );
  assert.equal(overflowY, "auto", `Se esperaba overflow-y: auto, pero es ${overflowY}`);
});

Then("el contenido completo permanece accesible", async function (this: CustomWorld) {
  const input = this.page.getByPlaceholder(/escribe un mensaje/i);
  const scrollHeight = await input.evaluate((element) =>
    element instanceof HTMLTextAreaElement ? element.scrollHeight : 0
  );
  const clientHeight = await input.evaluate((element) =>
    element instanceof HTMLTextAreaElement ? element.clientHeight : 0
  );
  assert.ok(
    scrollHeight > clientHeight,
    `El contenido debería exceder la altura visible (scrollHeight: ${scrollHeight}, clientHeight: ${clientHeight})`
  );
});

Given(
  "la IA concluyó el diagnóstico y recomienda prestadores del rubro {string}",
  async function (this: CustomWorld, rubro: string) {
    await this.setSession("consumer");

    await this.stubGet("/chatbot/conversations", [
      aAiConversation({
        last_message: anAiMessage({ id: 2, sender_role: "chatbot", content: DIAG_EXPLANATION, created_on: "2026-06-18T10:00:01Z" }),
      }),
    ]);

    await this.stubPost("/chatbot/conversations/1/job-requests", 201, aJobRequest({
      id: 100,
      conversation_id: 1,
      title: "Solicitud de Plomería",
      description: "Se está filtrando agua",
    }));

    await this.stubGet(
      "/conversations/1",
      aAiConversationDetail({
        diagnosis_completed: true,
        assessment: {
          outcome: "professional_required",
          problem_category: { id: 1, name: rubro },
        },
        messages: [
          anAiMessage({ id: 1, sender_role: "consumer", content: "Se está filtrando agua", created_on: "2026-06-18T10:00:00Z" }),
          anAiMessage({ id: 2, sender_role: "chatbot", content: DIAG_EXPLANATION, created_on: "2026-06-18T10:00:01Z" }),
        ],
        recommended_providers: [
          aProvider({ id: 10, name: "Juan", surname: "Gómez", category_name: rubro, profile_photo_url: "https://cdn.example/files/provider1.jpg" }),
          aProvider({ id: 11, name: "María", surname: "López", category_name: rubro, profile_photo_url: "https://cdn.example/files/provider2.jpg" }),
        ],
      })
    );

    await this.page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?id=1`);
    await this.page.waitForLoadState("networkidle");
  }
);

When("visualizo la respuesta del asistente", async function (this: CustomWorld) {
  const reply = this.page.getByText(DIAG_EXPLANATION).first();
  await reply.waitFor();
});

Then("veo la explicación del problema detectado", async function (this: CustomWorld) {
  const explanation = this.page.getByText(DIAG_EXPLANATION).first();
  await explanation.waitFor();
  assert.ok(await explanation.isVisible(), "No se ve la explicación");
});

Then("veo los prestadores recomendados del rubro {string}", async function (this: CustomWorld, rubro: string) {
  const section = this.page.getByText("Prestadores recomendados").first();
  await section.waitFor();
  assert.ok(await section.isVisible(), "No se ve la sección de prestadores recomendados");

  const categoryElement = this.page.getByText(rubro).first();
  await categoryElement.waitFor();
  assert.ok(await categoryElement.isVisible(), "No se ve el rubro recomendado");
});

Then("cada prestador muestra nombre y apellido", async function (this: CustomWorld) {
  const provider1 = this.page.getByText("Juan Gómez").first();
  const provider2 = this.page.getByText("María López").first();
  await provider1.waitFor();
  await provider2.waitFor();
  assert.ok((await provider1.isVisible()) && (await provider2.isVisible()), "Falta nombre y apellido de prestadores");
});

Then("cada prestador muestra el rubro {string}", async function (this: CustomWorld, rubro: string) {
  const categories = await this.page.getByText(rubro).all();
  assert.ok(categories.length >= 2, `Se esperaban al menos 2 menciones de ${rubro}`);
});

Then("cada prestador muestra su foto de perfil", async function (this: CustomWorld) {
  const img1 = this.page.getByRole("img", { name: "Juan Gómez" }).first();
  const img2 = this.page.getByRole("img", { name: "María López" }).first();
  await img1.waitFor(attachedState);
  await img2.waitFor(attachedState);
  assert.ok((await img1.count()) > 0, "No se encontró la foto de Juan Gómez");
  assert.ok((await img2.count()) > 0, "No se encontró la foto de María López");
});

Given("la IA respondió sin recomendar prestadores", async function (this: CustomWorld) {
  await this.setSession("consumer");

  await this.stubGet("/chatbot/conversations", [
    aAiConversation({
      last_message: anAiMessage({ id: 2, sender_role: "chatbot", content: DIAG_EXPLANATION, created_on: "2026-06-18T10:00:01Z" }),
    }),
  ]);

  await this.stubGet(
    "/conversations/1",
    aAiConversationDetail({
      messages: [
        anAiMessage({ id: 1, sender_role: "consumer", content: "Pérdida de agua", created_on: "2026-06-18T10:00:00Z" }),
        anAiMessage({ id: 2, sender_role: "chatbot", content: DIAG_EXPLANATION, created_on: "2026-06-18T10:00:01Z" }),
      ],
      recommended_providers: [],
    })
  );

  await this.page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?id=1`);
  await this.page.waitForLoadState("networkidle");
});

Then("no veo la sección de prestadores recomendados", async function (this: CustomWorld) {
  const section = this.page.getByText("Prestadores recomendados");
  assert.strictEqual(await section.count(), 0, "No se debería ver la sección de prestadores recomendados");
});

Then("la conversación continúa normalmente", async function (this: CustomWorld) {
  const input = this.page.getByPlaceholder(/escribe un mensaje/i);
  await input.waitFor();
  assert.ok(await input.isEnabled(), "El input debería estar habilitado");
});
