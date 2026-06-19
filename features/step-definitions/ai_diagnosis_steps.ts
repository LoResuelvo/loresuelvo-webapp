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

  if (!await hasApiStub("POST", "/chatbot/conversations")) {
    await addApiStub({
      method: "POST",
      endpoint: "/chatbot/conversations",
      status: 200,
      body: {
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

  if (!await hasApiStub("GET", "/conversations/1")) {
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
      },
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

  if (!await hasApiStub("GET", "/chatbot/conversations")) {
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
            content: "Entiendo. ¿La pérdida ocurre de forma constante o solamente cuando utilizas la canilla?",
            created_on: "2026-06-18T10:00:01Z",
          },
          updated_on: "2026-06-18T10:00:01Z",
        },
      ],
    });
  }

  if (!await hasApiStub("POST", "/chatbot/conversations")) {
    await addApiStub({
      method: "POST",
      endpoint: "/chatbot/conversations",
      status: 200,
      body: {
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
      },
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
      },
    });
  }

  await page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?id=1`);
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

Given("estoy en una conversación con el asistente", async () => {
  await setConsumerSession();

  if (!await hasApiStub("GET", "/chatbot/conversations")) {
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
            id: 1,
            sender_role: "consumer",
            content: "Se está filtrando agua debajo de la bacha",
            created_on: "2026-06-18T10:00:00Z",
          },
          updated_on: "2026-06-18T10:00:00Z",
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
      },
    });
  }

  await page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?id=1`);
  await page.waitForLoadState("networkidle");
});

When("envío un nuevo mensaje y la respuesta tarda en llegar", async () => {
  await page.route("**/chatbot/conversations/1/messages", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
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
            sender_role: "consumer",
            content: "Sigue perdiendo agua",
            created_on: "2026-06-18T10:05:00Z",
          },
          {
            id: 3,
            sender_role: "chatbot",
            content: "Podría ser la manguera de desagüe.",
            created_on: "2026-06-18T10:05:05Z",
          },
        ],
        response: {
          id: 3,
          sender_role: "chatbot",
          content: "Podría ser la manguera de desagüe.",
          created_on: "2026-06-18T10:05:05Z",
        },
        recommended_providers: [],
      }),
    });
  });

  const input = page.getByPlaceholder(/escribe un mensaje/i);
  await input.fill("Sigue perdiendo agua");
  const sendButton = page.getByRole("button", { name: /enviar mensaje/i });
  await sendButton.click();
});

When("envío un nuevo mensaje y el servicio falla", async () => {
  await page.route("**/chatbot/conversations/1/messages", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Internal Server Error" }),
    });
  });

  const input = page.getByPlaceholder(/escribe un mensaje/i);
  await input.fill("Sigue perdiendo agua");
  const sendButton = page.getByRole("button", { name: /enviar mensaje/i });
  await sendButton.click();
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

  if (!await hasApiStub("GET", "/chatbot/conversations")) {
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
            content: "Las respuestas brindadas son una orientación preliminar y no constituyen un diagnóstico técnico definitivo",
            created_on: "2026-06-18T10:00:01Z",
          },
          updated_on: "2026-06-18T10:00:01Z",
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
            content: "Las respuestas brindadas son una orientación preliminar y no constituyen un diagnóstico técnico definitivo",
            created_on: "2026-06-18T10:00:01Z",
          },
        ],
      },
    });
  }

  await page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?id=1`);
  await page.waitForLoadState("networkidle");
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

Given("la IA concluyó el diagnóstico y recomienda prestadores del rubro {string}", async (rubro: string) => {
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
          content: "El problema es una fuga. Te sugiero un plomero.",
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
          profile_photo_url: "https://cdn.example/files/provider1.jpg"
        },
        {
          id: 11,
          name: "María",
          surname: "López",
          category_name: rubro,
          profile_photo_url: "https://cdn.example/files/provider2.jpg"
        }
      ],
    },
  });

  await page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?id=1`);
  await page.waitForLoadState("networkidle");
});

When("visualizo la respuesta del asistente", async () => {
  const reply = page.getByText("El problema es una fuga. Te sugiero un plomero.").first();
  await reply.waitFor({ state: "visible" });
});

Then("veo una sección destacada indicando que el diagnóstico fue concluido", async () => {
  const badge = page.getByText("Diagnóstico concluido").first();
  await badge.waitFor({ state: "visible" });
  assert.ok(await badge.isVisible(), "No se ve la indicación de diagnóstico concluido");
});

Then("veo la explicación del problema detectado", async () => {
  const explanation = page.getByText("El problema es una fuga. Te sugiero un plomero.").first();
  await explanation.waitFor({ state: "visible" });
  assert.ok(await explanation.isVisible(), "No se ve la explicación");
});

Then("veo los prestadores recomendados del rubro {string}", async (rubro: string) => {
  const section = page.getByText("Prestadores recomendados").first();
  await section.waitFor({ state: "visible" });
  assert.ok(await section.isVisible(), "No se ve la sección de prestadores recomendados");
  
  const categoryElement = page.getByText(rubro).first();
  await categoryElement.waitFor({ state: "visible" });
  assert.ok(await categoryElement.isVisible(), "No se ve el rubro recomendado");
});

Then("cada prestador muestra nombre y apellido", async () => {
  const provider1 = page.getByText("Juan Gómez").first();
  const provider2 = page.getByText("María López").first();
  await provider1.waitFor({ state: "visible" });
  await provider2.waitFor({ state: "visible" });
  assert.ok(await provider1.isVisible() && await provider2.isVisible(), "Falta nombre y apellido de prestadores");
});

Then("cada prestador muestra el rubro {string}", async (rubro: string) => {
  const categories = await page.getByText(rubro).all();
  assert.ok(categories.length >= 2, `Se esperaban al menos 2 menciones de ${rubro}`);
});

Then("cada prestador muestra su foto de perfil", async () => {
  const img1 = page.getByRole("img", { name: "Juan Gómez" }).first();
  const img2 = page.getByRole("img", { name: "María López" }).first();
  await img1.waitFor({ state: "attached" });
  await img2.waitFor({ state: "attached" });
  assert.ok(await img1.count() > 0, "No se encontró la foto de Juan Gómez");
  assert.ok(await img2.count() > 0, "No se encontró la foto de María López");
});

When("selecciono la opción de buscar más prestadores", async () => {
  const btn = page.getByRole("button", { name: "Ver más especialistas" });
  await btn.waitFor({ state: "visible" });
  await btn.click();
  await page.waitForLoadState("networkidle");
});

Then("soy redirigido a la búsqueda de prestadores", async () => {
  await page.waitForURL(`**${ROUTES.consumer.buscar}**`);
  assert.ok(
    page.url().includes(ROUTES.consumer.buscar),
    `Se esperaba estar en ${ROUTES.consumer.buscar} pero la URL es ${page.url()}`,
  );
});

Given("la IA respondió sin recomendar prestadores", async () => {
  await setConsumerSession();

  await addApiStub({
    method: "GET",
    endpoint: "/chatbot/conversations",
    status: 200,
    body: [{
      id: 1,
      status: "active",
      title: "Pérdida de agua",
      last_message: {
        id: 2,
        sender_role: "chatbot",
        content: "Revisá el sifón",
        created_on: "2026-06-18T10:00:01Z",
      },
      updated_on: "2026-06-18T10:00:01Z",
    }],
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
      messages: [
        { id: 1, sender_role: "consumer", content: "Pérdida de agua", created_on: "2026-06-18T10:00:00Z" },
        { id: 2, sender_role: "chatbot", content: "El problema es una fuga. Te sugiero un plomero.", created_on: "2026-06-18T10:00:01Z" },
      ],
      recommended_providers: [],
    },
  });

  await page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?id=1`);
  await page.waitForLoadState("networkidle");
});

Then("no veo la sección de prestadores recomendados", async () => {
  const section = page.getByText("Prestadores recomendados");
  assert.strictEqual(await section.count(), 0, "No se debería ver la sección de prestadores recomendados");
});

Then("la conversación continúa normalmente", async () => {
  const input = page.getByPlaceholder(/escribe un mensaje/i);
  await input.waitFor({ state: "visible" });
  assert.ok(await input.isEnabled(), "El input debería estar habilitado");
});
