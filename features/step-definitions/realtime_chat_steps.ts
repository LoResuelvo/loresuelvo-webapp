import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { page } from "./landing_page_visualization_steps";
import { ROUTES } from "../../lib/routes";
import { AuthSession } from "../../infrastructure/auth/types";
import { MOCK_SESSION_COOKIE } from "../../infrastructure/auth/mock-adapter";
import { addApiStub } from "./stubs-helper";

const APP_URL = process.env.APP_URL || "http://localhost:3000";


interface WsEvent {
  type: string;
  conversation_id: number;
  message: {
    id: number;
    content: string;
    sender_role: string;
    created_on: string;
  };
}


let activeConversationId = 1;
let wsServer: import("playwright").WebSocketRoute | null = null;


async function setConsumerRealtimeSession() {
  const session: AuthSession = {
    user: {
      id: "consumer-001",
      email: "ana@example.com",
      firstName: "Ana",
      lastName: "Pérez",
      isOnboarded: true,
      role: "consumer",
    },
    accessToken: "mock-access-token",
  };

  await page.context().addCookies([{
    name: MOCK_SESSION_COOKIE,
    value: encodeURIComponent(JSON.stringify(session)),
    domain: "localhost",
    path: "/",
  }]);
}

async function setProviderRealtimeSession() {
  const session: AuthSession = {
    user: {
      id: "provider-001",
      email: "juan@example.com",
      firstName: "Juan",
      lastName: "Gómez",
      isOnboarded: true,
      role: "provider",
    },
    accessToken: "mock-access-token",
  };

  await page.context().addCookies([{
    name: MOCK_SESSION_COOKIE,
    value: encodeURIComponent(JSON.stringify(session)),
    domain: "localhost",
    path: "/",
  }]);
}

async function stubConversationApi(conversationId: number = 1) {
  await addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: [
      {
        id: conversationId,
        status: "accepted",
        counterpart: {
          id: "provider-001",
          role: "provider",
          name: "Juan",
          surname: "Gómez",
          category_name: "Plomería",
        },
        last_message: {
          id: 1,
          sender_role: "consumer",
          content: "Hola Juan, necesito reparar una pérdida de agua.",
          created_on: new Date().toISOString(),
        },
        updated_on: new Date().toISOString(),
      },
    ],
  });

  await addApiStub({
    method: "GET",
    endpoint: `/conversations/${conversationId}`,
    status: 200,
    body: {
      id: conversationId,
      status: "accepted",
      counterpart: {
        id: "provider-001",
        role: "provider",
        name: "Juan",
        surname: "Gómez",
        category_name: "Plomería",
      },
      messages: [
        {
          id: 1,
          sender_role: "consumer",
          content: "Hola Juan, necesito reparar una pérdida de agua.",
          created_on: new Date(Date.now() - 60000).toISOString(),
        },
      ],
      updated_on: new Date().toISOString(),
    },
  });

  await addApiStub({
    method: "POST",
    endpoint: `/conversations/${conversationId}/messages`,
    status: 201,
    body: {
      id: 99,
      conversation_id: conversationId,
      sender_role: "consumer",
      content: "Mensaje enviado",
      created_on: new Date().toISOString(),
    },
  });

  await addApiStub({
    method: "POST",
    endpoint: "/ws-tickets",
    status: 201,
    body: { ticket: "mock-ws-ticket-abc123" },
  });
}

/**
 * Intercepts the WebSocket connection and stores the server-side handle
 * so later steps can inject messages into it.
 */
async function interceptWebSocket() {
  wsServer = null;
  await page.routeWebSocket(/ws/, (ws) => {
    wsServer = ws;
    ws.onMessage(() => {
    });
  });
}

async function sendWsMessageToPage(event: WsEvent) {
  if (!wsServer) throw new Error("No hay WebSocket interceptado. ¿Se ejecutó interceptWebSocket() antes de navegar?");
  wsServer.send(JSON.stringify(event));
}


Given("que existe un chat activo entre el consumidor {string} y el prestador {string}",
  async (consumerName: string, providerName: string) => {
    // Representa el estado del mundo: la conversación ya existe en el backend.
    // El stub se configura en los pasos Given específicos de cada escenario.
    activeConversationId = 1;
  }
);


Given("que estoy en el chat con el prestador {string} como consumidor",
  async (providerName: string) => {
    await setConsumerRealtimeSession();
    await stubConversationApi(activeConversationId);
    await interceptWebSocket();
    await page.goto(APP_URL + ROUTES.consumer.messages + `?provider_id=provider-001&name=Juan&surname=Gómez`, { waitUntil: "networkidle" });
  }
);

Given("que estoy en el chat con el consumidor {string} como prestador",
  async (consumerName: string) => {
    await setProviderRealtimeSession();

    await addApiStub({
      method: "GET",
      endpoint: "/conversations",
      status: 200,
      body: [
        {
          id: activeConversationId,
          status: "accepted",
          counterpart: {
            id: "consumer-001",
            role: "consumer",
            name: "Ana",
            surname: "Pérez",
            category_name: "Plomería",
          },
          last_message: {
            id: 1,
            sender_role: "consumer",
            content: "Hola Juan, necesito reparar una pérdida de agua.",
            created_on: new Date().toISOString(),
          },
          updated_on: new Date().toISOString(),
        },
      ],
    });

    await addApiStub({
      method: "GET",
      endpoint: `/conversations/${activeConversationId}`,
      status: 200,
      body: {
        id: activeConversationId,
        status: "accepted",
        counterpart: {
          id: "consumer-001",
          role: "consumer",
          name: "Ana",
          surname: "Pérez",
          category_name: "Plomería",
        },
        messages: [
          {
            id: 1,
            sender_role: "consumer",
            content: "Hola Juan, necesito reparar una pérdida de agua.",
            created_on: new Date(Date.now() - 60000).toISOString(),
          },
        ],
        updated_on: new Date().toISOString(),
      },
    });

    await addApiStub({
      method: "POST",
      endpoint: "/ws-tickets",
      status: 201,
      body: { ticket: "mock-ws-ticket-abc123" },
    });

    await interceptWebSocket();
    await page.goto(APP_URL + ROUTES.provider.messages + `?consumer_id=consumer-001`, { waitUntil: "networkidle" });
  }
);

When("el prestador {string} me envía el mensaje {string}",
  async (providerName: string, messageContent: string) => {
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

When("el consumidor {string} me envía el mensaje {string}",
  async (consumerName: string, messageContent: string) => {
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

Then("veo el mensaje {string} en la pantalla del chat",
  async (messageContent: string) => {
    const message = page.getByText(messageContent, { exact: false }).first();
    await message.waitFor({ state: "visible", timeout: 5000 });
    assert.ok(await message.isVisible(), `El mensaje "${messageContent}" no aparece en el chat`);
  }
);


When("otro usuario me envía un mensaje en una conversación diferente",
  async () => {
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
    await page.waitForTimeout(1000);
  }
);

Then("ese mensaje no aparece en el chat con {string}",
  async (counterpartName: string) => {
    const foreignMessage = page.getByText("Mensaje de otra conversación que no debería aparecer", { exact: false });
    const isVisible = await foreignMessage.isVisible().catch(() => false);
    assert.ok(!isVisible, "El mensaje de otra conversación apareció indebidamente en el chat actual");
  }
);

Given("estoy viendo el final de la conversación",
  async () => {
    const chatPanel = page.locator("[data-testid='messages-list']");
    await chatPanel.waitFor({ state: "visible" });
    await chatPanel.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      el.dispatchEvent(new Event("scroll"));
    });
  }
);

Then("la pantalla hace scroll automáticamente para mostrar el nuevo mensaje",
  async () => {
    const newMessage = page.getByText("Confirmado para el jueves.", { exact: false }).last();
    await newMessage.waitFor({ state: "visible", timeout: 5000 });
    assert.ok(await newMessage.isVisible(), "El nuevo mensaje no es visible tras el scroll automático");

    const isInViewport = await newMessage.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });
    assert.ok(isInViewport, "El nuevo mensaje no quedó visible en el viewport tras el scroll automático");
  }
);


Given("estoy revisando mensajes anteriores en la conversación",
  async () => {
    await addApiStub({
      method: "GET",
      endpoint: `/conversations/${activeConversationId}`,
      status: 200,
      body: {
        id: activeConversationId,
        status: "accepted",
        counterpart: { id: "provider-001", role: "provider", name: "Juan", surname: "Gómez", category_name: "Plomería" },
        messages: Array.from({ length: 15 }, (_, i) => ({
          id: i + 1,
          sender_role: i % 2 === 0 ? "consumer" : "provider",
          content: `Msg ${i + 1}`,
          created_on: new Date(Date.now() - (15 - i) * 60000).toISOString(),
        })),
        updated_on: new Date().toISOString(),
      },
    });

    await page.reload({ waitUntil: "networkidle" });

    const chatPanel = page.locator("[data-testid='messages-list']");
    await chatPanel.waitFor({ state: "visible" });
    await chatPanel.evaluate((el) => {
      el.scrollTop = 0;
      el.dispatchEvent(new Event("scroll"));
    });
  }
);

Then("veo un aviso indicando que hay un mensaje nuevo",
  async () => {
    const newMessageAlert = page.locator("[data-testid='new-message-alert']");
    await newMessageAlert.waitFor({ state: "visible", timeout: 5000 });
    assert.ok(await newMessageAlert.isVisible(), "No se muestra el aviso de mensaje nuevo");
  }
);

Then("la pantalla no hace scroll automáticamente",
  async () => {
    const chatPanel = page.locator("[data-testid='messages-list']");
    const scrollTop = await chatPanel.evaluate((el) => el.scrollTop);
    assert.ok(scrollTop < 100, "La pantalla hizo scroll automático cuando no debería haberlo hecho");
  }
);
