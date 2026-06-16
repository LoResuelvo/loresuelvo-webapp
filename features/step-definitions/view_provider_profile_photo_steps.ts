import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { page } from "./landing_page_visualization_steps";
import { addApiStub } from "./stubs-helper";
import { ROUTES } from "../../lib/routes";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

Given("que tengo una conversacion iniciada con un prestador", async () => {
  await addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: [
      {
        id: 1,
        status: "pending",
        counterpart: {
          id: 20,
          role: "provider",
          name: "Juan",
          surname: "Pérez",
          category_name: "Plomería",
          profile_photo_url: "https://example.com/a",
        },
        last_message: {
          id: 1,
          sender_role: "consumer",
          content: "Hola",
          created_on: "2026-05-31T12:00:00Z",
        },
        updated_on: "2026-05-31T12:00:00Z",
      },
    ],
  });

  await addApiStub({
    method: "GET",
    endpoint: "/conversations/1",
    status: 200,
    body: {
      id: 1,
      status: "pending",
      counterpart: {
        id: 20,
        role: "provider",
        name: "Juan",
        surname: "Pérez",
        category_name: "Plomería",
        profile_photo_url: "https://example.com/a",
      },
      messages: [
        {
          id: 1,
          sender_role: "consumer",
          content: "Hola",
          created_on: "2026-05-31T12:00:00Z",
        },
      ],
      updated_on: "2026-05-31T12:00:00Z",
    },
  });
});

Given("estoy en la seccion de mensajes del dashboard de cliente", async () => {
  await page.goto(APP_URL + ROUTES.consumer.messages);
  await page.waitForLoadState("networkidle");
});

When("navego a la sección de mensajes del dashboard de cliente", async () => {
  await page.goto(APP_URL + ROUTES.consumer.messages);
  await page.waitForLoadState("networkidle");
});

Then("veo la tarjeta del técnico {string} con su foto de perfil", async (providerName: string) => {
  const providerCard = page.locator('.provider-card').filter({ hasText: providerName }).first();
  await providerCard.waitFor({ state: "visible" });
  const photo = providerCard.locator('img[data-testid="provider-profile-photo"]');
  assert.ok(await photo.isVisible(), `La foto de perfil del prestador ${providerName} no es visible`);
});

Then("veo la foto de perfil del prestador en el header del chat", async () => {
  const headerPhoto = page.locator('img[data-testid="chat-header-profile-photo"]').first();
  await headerPhoto.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await headerPhoto.isVisible(), "La foto de perfil en el header del chat no es visible");
});

Then("veo la foto de perfil del prestador en la lista de chats", async () => {
  const listPhoto = page.locator('.chat-list-item img[data-testid="chat-list-profile-photo"]').first();
  await listPhoto.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await listPhoto.isVisible(), "La foto de perfil en la lista de chats no es visible");
});
