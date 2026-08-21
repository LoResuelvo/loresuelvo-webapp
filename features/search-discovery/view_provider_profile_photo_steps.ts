import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, APP_URL } from "../support/world";
import { ROUTES } from "../../lib/routes";
import { aConversation, aConversationDetail, aConversationMessage, aCounterpart } from "../support/factories";

Given("que tengo una conversacion iniciada con un prestador", async function (this: CustomWorld) {
  const counterpart = aCounterpart({
    id: 20,
    role: "provider",
    name: "Juan",
    surname: "Pérez",
    category_name: "Plomería",
    profile_photo_url: "https://example.com/a",
  });

  const message = aConversationMessage({
    id: 1,
    sender_role: "consumer",
    content: "Hola",
    created_on: "2026-05-31T12:00:00Z",
  });

  await this.stubGet("/conversations", [
    aConversation({
      id: 1,
      status: "pending",
      counterpart,
      last_message: message,
      updated_on: "2026-05-31T12:00:00Z",
    }),
  ]);

  await this.stubGet(
    "/conversations/1",
    aConversationDetail({
      id: 1,
      status: "pending",
      counterpart,
      messages: [message],
      updated_on: "2026-05-31T12:00:00Z",
    })
  );
});

Given("estoy en la seccion de mensajes del dashboard de cliente", async function (this: CustomWorld) {
  await this.page.goto(APP_URL + ROUTES.consumer.messages);
  await this.page.waitForLoadState("networkidle");
});

When("navego a la sección de mensajes del dashboard de cliente", async function (this: CustomWorld) {
  await this.page.goto(APP_URL + ROUTES.consumer.messages);
  await this.page.waitForLoadState("networkidle");
});

Then(
  "veo la tarjeta del técnico {string} con su foto de perfil",
  async function (this: CustomWorld, providerName: string) {
    const providerCard = this.page.locator(".provider-card").filter({ hasText: providerName }).first();
    await providerCard.waitFor({ state: "visible" });
    const photo = providerCard.locator('img[data-testid="provider-profile-photo"]');
    assert.ok(await photo.isVisible(), `La foto de perfil del prestador ${providerName} no es visible`);
  }
);

Then("veo la foto de perfil del prestador en el header del chat", async function (this: CustomWorld) {
  const headerPhoto = this.page.locator('img[data-testid="chat-header-profile-photo"]').first();
  await headerPhoto.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await headerPhoto.isVisible(), "La foto de perfil en el header del chat no es visible");
});

Then("veo la foto de perfil del prestador en la lista de chats", async function (this: CustomWorld) {
  const listPhoto = this.page.locator('.chat-list-item img[data-testid="chat-list-profile-photo"]').first();
  await listPhoto.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await listPhoto.isVisible(), "La foto de perfil en la lista de chats no es visible");
});
