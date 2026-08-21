import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, APP_URL } from "../support/world";
import { ROUTES } from "../../lib/routes";
import { aAiConversation, aAiConversationDetail, aCategory, aProvider } from "../support/factories";

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

  const detail = aAiConversationDetail({
    id: 1,
    title: "Pérdida de agua",
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
  });

  if (!(await this.hasApiStub("POST", "/chatbot/conversations"))) {
    await this.stubPost("/chatbot/conversations", 200, {
      ...detail,
      conversation_id: 1,
    });
  }

  if (!(await this.hasApiStub("GET", "/conversations/1"))) {
    await this.stubGet("/conversations/1", {
      ...detail,
      conversation_id: 1,
    });
  }

  await this.page.goto(APP_URL + ROUTES.consumer.home);
  await this.page.waitForLoadState("networkidle");
});

When("ingreso un mensaje en el campo de diagnóstico", async function (this: CustomWorld) {
  const input = this.page.getByPlaceholder(/describe el problema/i);
  await input.waitFor({ state: "visible" });
  await input.fill("Se está filtrando agua debajo de la bacha");
});

When("presiono {string}", async function (this: CustomWorld, buttonName: string) {
  const button = this.page.getByRole("button", { name: new RegExp(buttonName, "i") }).first();
  await button.waitFor({ state: "visible" });
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
  await myMessage.waitFor({ state: "visible" });
  assert.ok(await myMessage.isVisible(), "No se ve el mensaje del usuario en el chat");
});

Given("inicié una conversación con el asistente", async function (this: CustomWorld) {
  await this.setSession("consumer");

  if (!(await this.hasApiStub("GET", "/chatbot/conversations"))) {
    await this.stubGet("/chatbot/conversations", [
      aAiConversation({
        id: 1,
        title: "Pérdida de agua",
        last_message: {
          id: 2,
          sender_role: "chatbot",
          content: "Entiendo. ¿La pérdida ocurre de forma constante o solamente cuando utilizas la canilla?",
          created_on: "2026-06-18T10:00:01Z",
        },
        updated_on: "2026-06-18T10:00:01Z",
      }),
    ]);
  }

  const detail = aAiConversationDetail({
    id: 1,
    title: "Pérdida de agua",
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
        content: "Entiendo. ¿La pérdida ocurre de forma constante o solamente cuando utilizas la canilla?",
        created_on: "2026-06-18T10:00:01Z",
      },
    ],
    response: {
      id: 2,
      sender_role: "chatbot",
      content: "Entiendo. ¿La pérdida ocurre de forma constante o solamente cuando utilizas la canilla?",
      created_on: "2026-06-18T10:00:01Z",
    },
    recommended_providers: [],
  });

  if (!(await this.hasApiStub("POST", "/chatbot/conversations"))) {
    await this.stubPost("/chatbot/conversations", 200, {
      ...detail,
      conversation_id: 1,
    });
  }

  if (!(await this.hasApiStub("GET", "/conversations/1"))) {
    await this.stubGet("/conversations/1", {
      ...detail,
      conversation_id: 1,
    });
  }

  await this.page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?id=1`);
  await this.page.waitForLoadState("networkidle");
});

When("el asistente procesa mi mensaje", async function (this: CustomWorld) {
  await this.page
    .getByText("Entiendo. ¿La pérdida ocurre de forma constante o solamente cuando utilizas la canilla?")
    .first()
    .waitFor({ state: "visible", timeout: 5000 });
});

Then("veo una respuesta del asistente en el chat", async function (this: CustomWorld) {
  const reply = this.page
    .getByText("Entiendo. ¿La pérdida ocurre de forma constante o solamente cuando utilizas la canilla?")
    .first();
  await reply.waitFor({ state: "visible" });
  assert.ok(await reply.isVisible(), "No se ve la respuesta del asistente en el chat");
});

Given("estoy en una conversación con el asistente", async function (this: CustomWorld) {
  await this.setSession("consumer");

  if (!(await this.hasApiStub("GET", "/chatbot/conversations"))) {
    await this.stubGet("/chatbot/conversations", [
      aAiConversation({
        id: 1,
        title: "Pérdida de agua",
        last_message: {
          id: 1,
          sender_role: "consumer",
          content: "Se está filtrando agua debajo de la bacha",
          created_on: "2026-06-18T10:00:00Z",
        },
        updated_on: "2026-06-18T10:00:00Z",
      }),
    ]);
  }

  if (!(await this.hasApiStub("GET", "/conversations/1"))) {
    await this.stubGet("/conversations/1", {
      id: 1,
      conversation_id: 1,
      status: "active",
      title: "Pérdida de agua",
      response_status: "pending",
      messages: [
        {
          id: 1,
          sender_role: "consumer",
          content: "Se está filtrando agua debajo de la bacha",
          created_on: "2026-06-18T10:00:00Z",
        },
      ],
    });
  }

  await this.page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?id=1`);
  await this.page.waitForLoadState("networkidle");
});

When("envío un nuevo mensaje y la respuesta tarda en llegar", async function (this: CustomWorld) {
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
  await this.page.route("**/chatbot/conversations/1/messages", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Internal Server Error" }),
    });
  });

  const input = this.page.getByPlaceholder(/escribe un mensaje/i);
  await input.fill("Sigue perdiendo agua");
  const sendButton = this.page.getByRole("button", { name: /enviar mensaje/i });
  await sendButton.click();
});

Then("veo un indicador de carga", async function (this: CustomWorld) {
  const indicator = this.page.getByRole("status", { name: /asistente escribiendo/i });
  await indicator.waitFor({ state: "visible" });
  assert.ok(await indicator.isVisible(), "No se ve el indicador de carga");
});

Then("no puedo enviar un nuevo mensaje hasta recibir una respuesta", async function (this: CustomWorld) {
  const input = this.page.getByPlaceholder(/escribe un mensaje/i);
  const sendButton = this.page.getByRole("button", { name: /enviar mensaje/i });
  await input.waitFor({ state: "visible" });
  assert.ok(await input.isDisabled(), "El input debería estar deshabilitado durante el procesamiento");
  assert.ok(await sendButton.isDisabled(), "El botón enviar debería estar deshabilitado durante el procesamiento");
});

Then("veo el mensaje del asistente {string}", async function (this: CustomWorld, expected: string) {
  const element = this.page.getByText(expected).first();
  await element.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await element.isVisible(), `No se ve el mensaje "${expected}"`);
});

Then("puedo volver a intentarlo", async function (this: CustomWorld) {
  const retry = this.page.getByRole("button", { name: /reintentar/i });
  await retry.waitFor({ state: "visible" });
  assert.ok(await retry.isVisible(), "No se ve el botón Reintentar");
});

When("visualizo la conversación con el asistente", async function (this: CustomWorld) {
  await this.setSession("consumer");

  if (!(await this.hasApiStub("GET", "/chatbot/conversations"))) {
    await this.stubGet("/chatbot/conversations", [
      aAiConversation({
        id: 1,
        title: "Pérdida de agua",
        last_message: {
          id: 2,
          sender_role: "chatbot",
          content:
            "Las respuestas brindadas son una orientación preliminar y no constituyen un diagnóstico técnico definitivo",
          created_on: "2026-06-18T10:00:01Z",
        },
        updated_on: "2026-06-18T10:00:01Z",
      }),
    ]);
  }

  if (!(await this.hasApiStub("GET", "/conversations/1"))) {
    await this.stubGet("/conversations/1", {
      id: 1,
      conversation_id: 1,
      status: "active",
      title: "Pérdida de agua",
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
          content:
            "Las respuestas brindadas son una orientación preliminar y no constituyen un diagnóstico técnico definitivo",
          created_on: "2026-06-18T10:00:01Z",
        },
      ],
    });
  }

  await this.page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?id=1`);
  await this.page.waitForLoadState("networkidle");
});

When("selecciono la opción {string}", async function (this: CustomWorld, optionName: string) {
  const option = this.page.getByRole("link", { name: new RegExp(optionName, "i") });
  await option.waitFor({ state: "visible" });
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
  await heading.waitFor({ state: "visible" });
  assert.ok(await heading.isVisible(), "No se ve la pantalla de conversación con el asistente");
});

Given("me encuentro escribiendo un mensaje para el asistente", async function (this: CustomWorld) {
  await this.setSession("consumer");
  await this.page.goto(APP_URL + ROUTES.consumer.aiMessages);
  await this.page.waitForLoadState("networkidle");

  const input = this.page.getByPlaceholder(/escribe un mensaje/i);
  await input.waitFor({ state: "visible" });
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

When("el contenido supera las 6 líneas visibles", async function (this: CustomWorld) {
  const input = this.page.getByPlaceholder(/escribe un mensaje/i);
  await input.fill(
    ["Linea 1", "Linea 2", "Linea 3", "Linea 4", "Linea 5", "Linea 6", "Linea 7 que supera el límite"].join("\n")
  );
});

Then("el campo de texto mantiene una altura máxima de 6 líneas", async function (this: CustomWorld) {
  const input = this.page.getByPlaceholder(/escribe un mensaje/i);
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
        id: 1,
        title: "Pérdida de agua",
        last_message: {
          id: 2,
          sender_role: "chatbot",
          content: "El problema es una fuga. Te sugiero un plomero.",
          created_on: "2026-06-18T10:00:01Z",
        },
        updated_on: "2026-06-18T10:00:01Z",
      }),
    ]);

    await this.stubPost("/chatbot/conversations/1/job-requests", 201, {
      id: 100,
      conversation_id: 1,
      title: "Solicitud de Plomería",
      description: "Se está filtrando agua",
    });

    await this.stubGet("/conversations/1", {
      id: 1,
      conversation_id: 1,
      status: "active",
      title: "Pérdida de agua",
      response_status: "answered",
      diagnosis_completed: true,
      assessment: {
        outcome: "professional_required",
        problem_category: {
          id: 1,
          name: rubro,
        },
      },
      messages: [
        {
          id: 1,
          sender_role: "consumer",
          content: "Se está filtrando agua",
          created_on: "2026-06-18T10:00:00Z",
        },
        {
          id: 2,
          sender_role: "chatbot",
          content: "El problema es una fuga. Te sugiero un plomero.",
          created_on: "2026-06-18T10:00:01Z",
        },
      ],
      recommended_providers: [
        {
          id: 10,
          name: "Juan",
          surname: "Gómez",
          category_name: rubro,
          profile_photo_url: "https://cdn.example/files/provider1.jpg",
        },
        {
          id: 11,
          name: "María",
          surname: "López",
          category_name: rubro,
          profile_photo_url: "https://cdn.example/files/provider2.jpg",
        },
      ],
    });

    await this.page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?id=1`);
    await this.page.waitForLoadState("networkidle");
  }
);

When("visualizo la respuesta del asistente", async function (this: CustomWorld) {
  const reply = this.page.getByText("El problema es una fuga. Te sugiero un plomero.").first();
  await reply.waitFor({ state: "visible" });
});

Then("veo la explicación del problema detectado", async function (this: CustomWorld) {
  const explanation = this.page.getByText("El problema es una fuga. Te sugiero un plomero.").first();
  await explanation.waitFor({ state: "visible" });
  assert.ok(await explanation.isVisible(), "No se ve la explicación");
});

Then("veo los prestadores recomendados del rubro {string}", async function (this: CustomWorld, rubro: string) {
  const section = this.page.getByText("Prestadores recomendados").first();
  await section.waitFor({ state: "visible" });
  assert.ok(await section.isVisible(), "No se ve la sección de prestadores recomendados");

  const categoryElement = this.page.getByText(rubro).first();
  await categoryElement.waitFor({ state: "visible" });
  assert.ok(await categoryElement.isVisible(), "No se ve el rubro recomendado");
});

Then("cada prestador muestra nombre y apellido", async function (this: CustomWorld) {
  const provider1 = this.page.getByText("Juan Gómez").first();
  const provider2 = this.page.getByText("María López").first();
  await provider1.waitFor({ state: "visible" });
  await provider2.waitFor({ state: "visible" });
  assert.ok((await provider1.isVisible()) && (await provider2.isVisible()), "Falta nombre y apellido de prestadores");
});

Then("cada prestador muestra el rubro {string}", async function (this: CustomWorld, rubro: string) {
  const categories = await this.page.getByText(rubro).all();
  assert.ok(categories.length >= 2, `Se esperaban al menos 2 menciones de ${rubro}`);
});

Then("cada prestador muestra su foto de perfil", async function (this: CustomWorld) {
  const img1 = this.page.getByRole("img", { name: "Juan Gómez" }).first();
  const img2 = this.page.getByRole("img", { name: "María López" }).first();
  await img1.waitFor({ state: "attached" });
  await img2.waitFor({ state: "attached" });
  assert.ok((await img1.count()) > 0, "No se encontró la foto de Juan Gómez");
  assert.ok((await img2.count()) > 0, "No se encontró la foto de María López");
});

Given("la IA respondió sin recomendar prestadores", async function (this: CustomWorld) {
  await this.setSession("consumer");

  await this.stubGet("/chatbot/conversations", [
    aAiConversation({
      id: 1,
      title: "Pérdida de agua",
      last_message: {
        id: 2,
        sender_role: "chatbot",
        content: "Revisá el sifón",
        created_on: "2026-06-18T10:00:01Z",
      },
      updated_on: "2026-06-18T10:00:01Z",
    }),
  ]);

  await this.stubGet("/conversations/1", {
    id: 1,
    conversation_id: 1,
    status: "active",
    title: "Pérdida de agua",
    response_status: "answered",
    messages: [
      { id: 1, sender_role: "consumer", content: "Pérdida de agua", created_on: "2026-06-18T10:00:00Z" },
      {
        id: 2,
        sender_role: "chatbot",
        content: "El problema es una fuga. Te sugiero un plomero.",
        created_on: "2026-06-18T10:00:01Z",
      },
    ],
    recommended_providers: [],
  });

  await this.page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?id=1`);
  await this.page.waitForLoadState("networkidle");
});

Then("no veo la sección de prestadores recomendados", async function (this: CustomWorld) {
  const section = this.page.getByText("Prestadores recomendados");
  assert.strictEqual(await section.count(), 0, "No se debería ver la sección de prestadores recomendados");
});

Then("la conversación continúa normalmente", async function (this: CustomWorld) {
  const input = this.page.getByPlaceholder(/escribe un mensaje/i);
  await input.waitFor({ state: "visible" });
  assert.ok(await input.isEnabled(), "El input debería estar habilitado");
});
