import { Given, Then, When } from "@cucumber/cucumber";
import assert from "assert";
import { ROUTES } from "../../lib/routes";
import { aConversation, aConversationDetail } from "../support/factories";
import { APP_URL, CustomWorld } from "../support/world";

const consumerPhotoUrl = "http://localhost:3001/mock-consumer-profile.svg";
type ConversationCounterpart = ReturnType<typeof aConversation>["counterpart"];
type ProfilePhotoOverride = { profile_photo_url?: string | null };

function consumerCounterpart(
  photo: ProfilePhotoOverride = { profile_photo_url: consumerPhotoUrl },
): ConversationCounterpart {
  return {
    id: 10,
    role: "consumer",
    name: "María",
    surname: "Fernández",
    ...photo,
  };
}

function consumerCounterpartWithoutPhoto(value: string): ConversationCounterpart {
  const photo = value === "null"
    ? { profile_photo_url: null }
    : value === "cadena vacía"
      ? { profile_photo_url: "" }
      : {};
  return consumerCounterpart(photo);
}

async function openProviderConversations(
  world: CustomWorld,
  counterpart = consumerCounterpart(),
) {
  const detailCounterpart = {
    ...counterpart,
    profile_photo_url: counterpart.profile_photo_url ?? undefined,
  };
  await world.setSession("provider", {
    id: "provider-001",
    email: "prestador@loresuelvo.test",
    firstName: "Paula",
    lastName: "Ríos",
    isOnboarded: true,
  });
  await world.stubGet("/job-requests", []);
  await world.stubGet("/service-proposals", []);
  await world.stubGet("/conversations", [
    aConversation({
      id: 1,
      status: "accepted",
      counterpart,
    }),
  ]);
  await world.stubGet(
    "/conversations/1",
    aConversationDetail({
      id: 1,
      status: "accepted",
      counterpart: detailCounterpart,
    }),
  );
  if (counterpart.profile_photo_url) {
    await world.page.route("**/mock-consumer-profile.svg", (route) =>
      route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="16" fill="#60a5fa"/></svg>',
      }),
    );
  }
  await world.page.goto(APP_URL + ROUTES.provider.messages, { waitUntil: "networkidle" });
}

Given(
  "que soy un prestador con una conversación cuyo consumidor tiene una foto de perfil disponible",
  async function (this: CustomWorld) {
    await openProviderConversations(this);
  },
);

Given(
  /^que soy un prestador con una conversación cuya foto del consumidor llega como (.+)$/,
  async function (this: CustomWorld, value: string) {
    await openProviderConversations(this, consumerCounterpartWithoutPhoto(value));
  },
);

When("abro esa conversación", async function (this: CustomWorld) {
  const list = this.page.getByRole("list", { name: "Lista de conversaciones" });
  await list.getByRole("listitem").first().click();
  await this.page.waitForURL((url) => url.searchParams.get("consumer_id") === "10");
});

Then(
  "el encabezado muestra la foto y el nombre del consumidor correspondiente",
  async function (this: CustomWorld) {
    const image = this.page.getByTestId("chat-header-profile-photo");
    await image.waitFor({ state: "visible" });
    await this.page.waitForFunction(() => {
      const profilePhoto = document.querySelector<HTMLImageElement>(
        '[data-testid="chat-header-profile-photo"]',
      );
      return Boolean(profilePhoto?.complete && profilePhoto.naturalWidth > 0);
    });
    assert.ok(
      await this.page
        .getByTestId("chat-panel")
        .getByText("María Fernández", { exact: true })
        .isVisible(),
    );
  },
);

Then(
  "el encabezado muestra el avatar de respaldo y el nombre del consumidor",
  async function (this: CustomWorld) {
    await this.page.getByTestId("chat-header-profile-photo-fallback").waitFor({ state: "visible" });
    assert.ok(
      await this.page
        .getByTestId("chat-panel")
        .getByText("María Fernández", { exact: true })
        .isVisible(),
    );
  },
);

Then("no muestra una imagen rota", async function (this: CustomWorld) {
  assert.equal(await this.page.getByTestId("chat-header-profile-photo").count(), 0);
});

Then(
  "la imagen tiene un texto alternativo que identifica al consumidor",
  async function (this: CustomWorld) {
    const alt = await this.page.getByTestId("chat-header-profile-photo").getAttribute("alt");
    assert.ok(alt?.includes("María"), "El texto alternativo no identifica al consumidor");
  },
);
