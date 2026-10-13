import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { subDays } from "date-fns";
import type { ApiConversationMessage } from "../../infrastructure/api/types";
import { t } from "../../infrastructure/i18n/translations";
import { ROUTES } from "../../lib/routes";
import { aConversation, aConversationDetail, aConversationMessage, aWsTicket } from "../support/factories";
import { APP_URL, CustomWorld, visibleTimeout } from "../support/world";

function messageAtDayOffset(id: number, dayOffset: number, minuteOffset = 0): ApiConversationMessage {
  const createdOn = subDays(new Date(), dayOffset);
  createdOn.setHours(12, 0, 0, 0);
  createdOn.setMinutes(createdOn.getMinutes() + minuteOffset);
  return aConversationMessage({
    id,
    content: `Mensaje ${id}`,
    created_on: createdOn.toISOString(),
  });
}

async function prepareConsumerChat(world: CustomWorld, messages: ApiConversationMessage[]) {
  const conversationId = world.activeConversationId;
  const lastMessage = messages[messages.length - 1] ?? aConversationMessage();

  await world.setSession("consumer", {
    id: "consumer-001",
    email: "ana@example.com",
    firstName: "Ana",
    lastName: "Pérez",
    isOnboarded: true,
  });
  await world.stubGet("/conversations", [aConversation({
    id: conversationId,
    status: "accepted",
    last_message: lastMessage,
    updated_on: lastMessage.created_on,
  })]);
  await world.stubGet(`/conversations/${conversationId}`, aConversationDetail({
    id: conversationId,
    status: "accepted",
    messages,
  }));
  await world.stubPost("/ws-tickets", 201, aWsTicket());
  await world.stubGet("/job-requests", []);
  await world.stubGet("/service-proposals", []);
}

async function openConsumerChat(world: CustomWorld) {
  await world.page.goto(
    APP_URL + ROUTES.consumer.messages + "?provider_id=1&name=Juan&surname=G%C3%B3mez",
    { waitUntil: "domcontentloaded" },
  );
  await world.page.getByTestId("messages-list").waitFor(visibleTimeout);
}

async function interceptChatWebSocket(world: CustomWorld) {
  world.wsServer = null;
  await world.page.routeWebSocket(/.*\/ws.*/, (socket) => {
    world.wsServer = socket;
    socket.onMessage(() => {});
  });
}

async function sendTodayMessage(world: CustomWorld) {
  let attempts = 0;
  while (!world.wsServer && attempts < 100) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    attempts += 1;
  }

  assert.ok(world.wsServer, "No se abrió el WebSocket del chat");
  world.wsServer.send(JSON.stringify({
    type: "conversation.message.created",
    conversation_id: world.activeConversationId,
    message: {
      id: 2,
      content: "Mensaje de hoy",
      sender_role: "provider",
      created_on: new Date().toISOString(),
    },
  }));
}

Given(/^una conversación con mensajes de (hoy|ayer|hace 2 a 6 días|hace 7 días o más)$/, async function (this: CustomWorld, age: string) {
  const daysAgo = age === "hoy" ? 0 : age === "ayer" ? 1 : age === "hace 2 a 6 días" ? 3 : 7;
  await prepareConsumerChat(this, [messageAtDayOffset(1, daysAgo)]);
});

When("abro la conversación", async function (this: CustomWorld) {
  await openConsumerChat(this);
});

Then(
  /aparece un separador con (.*) antes de esos mensajes/,
  async function (this: CustomWorld, expectedLabel: string) {
    const separator = this.page.getByTestId("chat-day-separator").first();
    await separator.waitFor(visibleTimeout);
    const actualLabel = (await separator.innerText()).trim();

    if (expectedLabel === "nombre del día en español") {
      assert.ok(
        t.messaging.chatDaySeparator.weekdays.includes(actualLabel),
        `La etiqueta "${actualLabel}" no es un día de la semana en español`,
      );
    } else if (expectedLabel === "fecha completa dd/MM/yyyy") {
      assert.match(actualLabel, /^\d{2}\/\d{2}\/\d{4}$/, "La etiqueta no usa el formato dd/MM/yyyy");
    } else {
      assert.strictEqual(actualLabel, expectedLabel);
    }

    const nextItemId = await separator.evaluate((node) =>
      node.nextElementSibling?.querySelector("[data-testid^='message-bubble-']")?.getAttribute("data-testid"),
    );
    assert.strictEqual(nextItemId, "message-bubble-1");
  },
);

Given("una conversación con varios mensajes del mismo día", async function (this: CustomWorld) {
  await prepareConsumerChat(this, [
    messageAtDayOffset(1, 0, -2),
    messageAtDayOffset(2, 0, -1),
    messageAtDayOffset(3, 0),
  ]);
});

Then(
  "aparece un único separador antes del primer mensaje de ese día",
  async function (this: CustomWorld) {
    const separators = this.page.getByTestId("chat-day-separator");
    await separators.first().waitFor(visibleTimeout);
    assert.strictEqual(await separators.count(), 1, "Debe aparecer un separador para todo el día");
    const nextItemId = await separators.first().evaluate((node) =>
      node.nextElementSibling?.querySelector("[data-testid^='message-bubble-']")?.getAttribute("data-testid"),
    );
    assert.strictEqual(nextItemId, "message-bubble-1");
  },
);

Given("una conversación con mensajes de varios días", async function (this: CustomWorld) {
  await prepareConsumerChat(this, [
    messageAtDayOffset(1, 8),
    messageAtDayOffset(2, 3),
    messageAtDayOffset(3, 0),
  ]);
});

Then(
  "aparece el separador correspondiente al comenzar cada día",
  async function (this: CustomWorld) {
    const separators = this.page.getByTestId("chat-day-separator");
    await separators.first().waitFor(visibleTimeout);
    assert.strictEqual(await separators.count(), 3, "Debe aparecer un separador al comenzar cada día");

    for (let index = 0; index < 3; index += 1) {
      const nextItemId = await separators.nth(index).evaluate((node) =>
        node.nextElementSibling?.querySelector("[data-testid^='message-bubble-']")?.getAttribute("data-testid"),
      );
      assert.strictEqual(nextItemId, `message-bubble-${index + 1}`);
    }
  },
);

Given("una conversación abierta cuyo último mensaje es de ayer", async function (this: CustomWorld) {
  await prepareConsumerChat(this, [messageAtDayOffset(1, 1)]);
  await interceptChatWebSocket(this);
  await openConsumerChat(this);
  await this.page.getByTestId("message-bubble-1").waitFor(visibleTimeout);
});

When("llega un mensaje de hoy", async function (this: CustomWorld) {
  await sendTodayMessage(this);
});

Then("aparece el separador Hoy antes del nuevo mensaje", async function (this: CustomWorld) {
  const todaySeparator = this.page.getByTestId("chat-day-separator").filter({ hasText: "Hoy" });
  await todaySeparator.waitFor(visibleTimeout);
  await this.page.getByTestId("message-bubble-2").waitFor(visibleTimeout);
  const nextItemId = await todaySeparator.evaluate((node) =>
    node.nextElementSibling?.querySelector("[data-testid^='message-bubble-']")?.getAttribute("data-testid"),
  );
  assert.strictEqual(nextItemId, "message-bubble-2");
});
