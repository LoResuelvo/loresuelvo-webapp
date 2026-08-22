import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, APP_URL, visibleTimeout, attachedTimeout, waitTimeout, attachedState } from "../support/world";
import { ROUTES } from "../../lib/routes";
import { aConversation, aConversationDetail, aConversationMessage, aCounterpart, aWsTicket } from "../support/factories";

interface WsEvent {
  type: string;
  conversation_id: number;
  message: {
    id: number;
    content: string;
    sender_role: string;
    created_on: string;
    images?: { id: number; url: string; original_name: string }[];
  };
}

let activeConversationId = 1;
let wsServer: import("playwright").WebSocketRoute | null = null;

async function setConsumerRealtimeSession(world: CustomWorld) {
  await world.setSession("consumer", {
    id: "consumer-001",
    email: "ana@example.com",
    firstName: "Ana",
    lastName: "Pérez",
    isOnboarded: true,
  });
}

async function setProviderRealtimeSession(world: CustomWorld) {
  await world.setSession("provider", {
    id: "provider-001",
    email: "juan@example.com",
    firstName: "Juan",
    lastName: "Gómez",
    isOnboarded: true,
  });
}

async function stubConversationApi(world: CustomWorld, conversationId: number = 1) {
  await world.stubGet("/conversations", [
    aConversation({
      id: conversationId,
      status: "accepted",
      counterpart: aCounterpart({
        id: 1,
        role: "provider",
        name: "Juan",
        surname: "Gómez",
        category_name: "Plomería",
      }),
      last_message: aConversationMessage({
        id: 1,
        sender_role: "consumer",
        content: "Hola Juan, necesito reparar una pérdida de agua.",
        created_on: new Date().toISOString(),
      }),
      updated_on: new Date().toISOString(),
    }),
  ]);

  await world.stubGet(`/conversations/${conversationId}`, aConversationDetail({
    id: conversationId,
    status: "accepted",
    counterpart: aCounterpart({
      id: "provider-001",
      role: "provider",
      name: "Juan",
      surname: "Gómez",
      category_name: "Plomería",
    }),
    messages: [
      aConversationMessage({
        id: 1,
        sender_role: "consumer",
        content: "Hola Juan, necesito reparar una pérdida de agua.",
        created_on: new Date(Date.now() - 60000).toISOString(),
      }),
    ],
    updated_on: new Date().toISOString(),
  }));

  await world.stubPost(`/conversations/${conversationId}/messages`, 201, aConversationMessage({
    id: 99,
    sender_role: "consumer",
    content: "Mensaje enviado",
    created_on: new Date().toISOString(),
  }));

  await world.stubPost("/ws-tickets", 201, aWsTicket("mock-ws-ticket-abc123"));
  await world.stubGet("/job-requests", []);
  await world.stubGet("/service-proposals", []);
}

async function interceptWebSocket(world: CustomWorld) {
  wsServer = null;
  (global as any).wsServer = null;
  await world.page.routeWebSocket(/.*\/ws.*/, (ws) => {
    wsServer = ws;
    (global as any).wsServer = ws;
    ws.onMessage(() => {});
  });
}

async function sendWsMessageToPage(event: WsEvent) {
  let attempts = 0;
  while (!wsServer && attempts < 100) {
    await new Promise((r) => setTimeout(r, 200));
    attempts++;
  }
  if (!wsServer) throw new Error("No hay WebSocket interceptado. ¿Se ejecutó interceptWebSocket() antes de navegar?");
  wsServer.send(JSON.stringify(event));
}

Given(
  "que existe un chat activo entre el consumidor {string} y el prestador {string}",
  async function (this: CustomWorld, consumerName: string, providerName: string) {
    activeConversationId = 1;
  }
);

Given(
  "que estoy en el chat con el prestador {string} como consumidor",
  async function (this: CustomWorld, providerName: string) {
    await setConsumerRealtimeSession(this);
    await stubConversationApi(this, activeConversationId);
    await interceptWebSocket(this);
    await this.page.goto(
      APP_URL + ROUTES.consumer.messages + `?provider_id=1&name=Juan&surname=Gómez`,
      { waitUntil: "domcontentloaded" }
    );
    await this.page.locator('[data-testid="messages-list"]').waitFor({ state: "visible" });
    await this.page.getByText("Hola Juan, necesito reparar una pérdida de agua.").waitFor({ state: "visible" });
  }
);

Given(
  "que estoy en el chat con el consumidor {string} como prestador",
  async function (this: CustomWorld, consumerName: string) {
    await setProviderRealtimeSession(this);

    await this.stubGet("/conversations", [
      aConversation({
        id: activeConversationId,
        status: "accepted",
        counterpart: aCounterpart({
          id: 1,
          role: "consumer",
          name: "Ana",
          surname: "Pérez",
          category_name: "Plomería",
        }),
        last_message: aConversationMessage({
          id: 1,
          sender_role: "consumer",
          content: "Hola Juan, necesito reparar una pérdida de agua.",
          created_on: new Date().toISOString(),
        }),
        updated_on: new Date().toISOString(),
      }),
    ]);

    await this.stubGet(`/conversations/${activeConversationId}`, aConversationDetail({
      id: activeConversationId,
      status: "accepted",
      counterpart: aCounterpart({
        id: 1,
        role: "consumer",
        name: "Ana",
        surname: "Pérez",
        category_name: "Plomería",
      }),
      messages: [
        aConversationMessage({
          id: 1,
          sender_role: "consumer",
          content: "Hola Juan, necesito reparar una pérdida de agua.",
          created_on: new Date(Date.now() - 60000).toISOString(),
        }),
      ],
      updated_on: new Date().toISOString(),
    }));

    await this.stubPost("/ws-tickets", 201, aWsTicket("mock-ws-ticket-abc123"));
    await this.stubGet("/job-requests", []);
    await this.stubGet("/service-proposals", []);

    await interceptWebSocket(this);
    await this.page.goto(APP_URL + ROUTES.provider.messages + `?consumer_id=1`, {
      waitUntil: "domcontentloaded",
    });
    await this.page.locator('[data-testid="messages-list"]').waitFor({ state: "visible" });
    await this.page.getByText("Hola Juan, necesito reparar una pérdida de agua.").waitFor({ state: "visible" });
  }
);

When(
  "el prestador {string} me envía el mensaje {string}",
  async function (this: CustomWorld, providerName: string, messageContent: string) {
    await sendWsMessageToPage({
      type: "conversation.message.created",
      conversation_id: activeConversationId,
      message: {
        id: 200,
        content: messageContent,
        sender_role: "provider",
        created_on: new Date().toISOString(),
      },
    });
  }
);

When(
  "el consumidor {string} me envía el mensaje {string}",
  async function (this: CustomWorld, consumerName: string, messageContent: string) {
    await sendWsMessageToPage({
      type: "conversation.message.created",
      conversation_id: activeConversationId,
      message: {
        id: 201,
        content: messageContent,
        sender_role: "consumer",
        created_on: new Date().toISOString(),
      },
    });
  }
);

Then("veo el mensaje {string} en la pantalla del chat", async function (this: CustomWorld, messageContent: string) {
  const message = this.page.getByText(messageContent, { exact: false }).first();
  await message.waitFor(visibleTimeout);
  assert.ok(await message.isVisible(), `El mensaje "${messageContent}" no aparece en el chat`);
});

When("otro usuario me envía un mensaje en una conversación diferente", async function (this: CustomWorld) {
  await sendWsMessageToPage({
    type: "conversation.message.created",
    conversation_id: 99,
    message: {
      id: 300,
      content: "Mensaje de otra conversación que no debería aparecer",
      sender_role: "provider",
      created_on: new Date().toISOString(),
    },
  });
  await this.page.waitForTimeout(100);
});

Then("ese mensaje no aparece en el chat con {string}", async function (this: CustomWorld, counterpartName: string) {
  const foreignMessage = this.page.getByText("Mensaje de otra conversación que no debería aparecer", { exact: false });
  const isVisible = await foreignMessage.isVisible().catch(() => false);
  assert.ok(!isVisible, "El mensaje de otra conversación apareció indebidamente en el chat actual");
});

Given("estoy viendo el final de la conversación", async function (this: CustomWorld) {
  const chatPanel = this.page.locator("[data-testid='messages-list']");
  await chatPanel.waitFor({ state: "visible" });
  await chatPanel.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
    el.dispatchEvent(new Event("scroll"));
  });
});

Then(
  "la pantalla hace scroll automáticamente para mostrar el nuevo mensaje",
  async function (this: CustomWorld) {
    const newMessage = this.page.getByText("Confirmado para el jueves.", { exact: false }).last();
    await newMessage.waitFor(visibleTimeout);
    assert.ok(await newMessage.isVisible(), "El nuevo mensaje no es visible tras el scroll automático");

    const isInViewport = await newMessage.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });
    assert.ok(isInViewport, "El nuevo mensaje no quedó visible en el viewport tras el scroll automático");
  }
);

Given("estoy revisando mensajes anteriores en la conversación", async function (this: CustomWorld) {
  await this.stubGet(`/conversations/${activeConversationId}`, aConversationDetail({
    id: activeConversationId,
    status: "accepted",
    counterpart: aCounterpart({ id: 1, role: "provider", name: "Juan", surname: "Gómez", category_name: "Plomería" }),
    messages: Array.from({ length: 15 }, (_, i) => aConversationMessage({
      id: i + 1,
      sender_role: i % 2 === 0 ? "consumer" : "provider",
      content: `Msg ${i + 1}`,
      created_on: new Date(Date.now() - (15 - i) * 60000).toISOString(),
    })),
    updated_on: new Date().toISOString(),
  }));

  wsServer = null;
  await this.page.reload();

  const chatPanel = this.page.locator("[data-testid='messages-list']");
  await chatPanel.waitFor({ state: "visible" });

  const msg15 = this.page.getByText("Msg 15");
  await msg15.waitFor({ state: "visible" });

  let attempts = 0;
  while (!wsServer && attempts < 100) {
    await new Promise((r) => setTimeout(r, 200));
    attempts++;
  }

  await this.page.waitForTimeout(500);
  await chatPanel.evaluate((el) => {
    el.scrollTop = 0;
    el.dispatchEvent(new Event("scroll"));
  });

  await this.page.waitForTimeout(500);
});

Then("veo un aviso indicando que hay un mensaje nuevo", async function (this: CustomWorld) {
  const newMessageAlert = this.page.locator("[data-testid='new-message-alert']");
  await newMessageAlert.waitFor(visibleTimeout);
  assert.ok(await newMessageAlert.isVisible(), "No se muestra el aviso de mensaje nuevo");
});

Then("la pantalla no hace scroll automáticamente", async function (this: CustomWorld) {
  const chatPanel = this.page.locator("[data-testid='messages-list']");
  const scrollTop = await chatPanel.evaluate((el) => el.scrollTop);
  assert.ok(scrollTop < 100, "La pantalla hizo scroll automático cuando no debería haberlo hecho");
});
