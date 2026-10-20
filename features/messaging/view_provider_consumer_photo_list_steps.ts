import { Given, Then, When } from "@cucumber/cucumber";
import assert from "assert";
import type { ApiConversation } from "../../infrastructure/api/types";
import { ROUTES } from "../../lib/routes";
import { aConversation, aConversationDetail } from "../support/factories";
import { stubProfilePhoto } from "../support/profile-photo";
import { APP_URL, CustomWorld } from "../support/world";

const consumerPhotoUrl = (consumerId: number) =>
  `http://localhost:3001/mock-consumer-${consumerId}-profile.svg`;

interface ConsumerFixture {
  id: number;
  name: string;
  surname: string;
  photoUrl: string;
}

const photoConsumers: ConsumerFixture[] = [
  { id: 10, name: "María", surname: "Fernández", photoUrl: consumerPhotoUrl(10) },
  { id: 11, name: "Javier", surname: "Torres", photoUrl: consumerPhotoUrl(11) },
];

function consumerConversation(
  consumer: ConsumerFixture,
  status: "pending" | "accepted",
  profilePhotoUrl: string | null | undefined = consumer.photoUrl,
): ApiConversation {
  return aConversation({
    id: consumer.id,
    status,
    counterpart: {
      id: consumer.id,
      role: "consumer",
      name: consumer.name,
      surname: consumer.surname,
      ...(profilePhotoUrl !== undefined ? { profile_photo_url: profilePhotoUrl } : {}),
    },
    last_message: {
      id: consumer.id,
      sender_role: "consumer",
      content: "Necesito ayuda con un trabajo.",
      created_on: "2026-08-20T10:00:00Z",
    },
    updated_on: `2026-08-20T10:0${consumer.id - 10}:00Z`,
  });
}

async function openProviderConversationList(
  world: CustomWorld,
  conversations: ApiConversation[],
  photoUrls: string[],
) {
  await world.setSession("provider", {
    id: "provider-001",
    email: "prestador@loresuelvo.test",
    firstName: "Paula",
    lastName: "Ríos",
    isOnboarded: true,
  });
  await world.stubGet("/job-requests", []);
  await world.stubGet("/service-proposals", []);
  await world.stubGet("/conversations", conversations);

  for (const conversation of conversations) {
    await world.stubGet(
      `/conversations/${conversation.id}`,
      aConversationDetail({
        id: conversation.id,
        status: conversation.status,
        counterpart: {
          id: conversation.counterpart.id,
          role: "consumer",
          name: conversation.counterpart.name,
          surname: conversation.counterpart.surname,
        },
        messages: [],
      }),
    );
  }

  for (const photoUrl of photoUrls) {
    await stubProfilePhoto(world.page, photoUrl);
  }

  await world.page.goto(APP_URL + ROUTES.provider.messages, { waitUntil: "networkidle" });
}

Given(
  "que soy un prestador con conversaciones pendientes y aceptadas de distintos consumidores con fotos de perfil disponibles",
  async function (this: CustomWorld) {
    const conversations = [
      consumerConversation(photoConsumers[0], "accepted"),
      consumerConversation(photoConsumers[1], "pending"),
    ];
    await openProviderConversationList(
      this,
      conversations,
      photoConsumers.map((consumer) => consumer.photoUrl),
    );
  },
);

When("visualizo mi listado de conversaciones", async function (this: CustomWorld) {
  await this.page.getByRole("list", { name: "Lista de conversaciones" }).waitFor({ state: "visible" });
});

Then(
  "cada conversación muestra la foto y el nombre de su consumidor correspondiente",
  async function (this: CustomWorld) {
    const list = this.page.getByRole("list", { name: "Lista de conversaciones" });
    const items = list.getByRole("listitem");
    assert.equal(await items.count(), photoConsumers.length, "Deben aparecer ambos consumidores");

    for (const consumer of photoConsumers) {
      const item = items.filter({
        has: this.page.getByText(`${consumer.name} ${consumer.surname}`, { exact: true }),
      });
      assert.equal(await item.count(), 1, `No aparece la conversación de ${consumer.name}`);
      assert.ok(await item.getByText(`${consumer.name} ${consumer.surname}`, { exact: true }).isVisible());

      const image = item.getByTestId("chat-list-profile-photo");
      assert.equal(await image.count(), 1, `Falta la foto de ${consumer.name}`);
      const imageHandle = await image.elementHandle();
      assert.ok(imageHandle, `No se encontró el elemento de imagen de ${consumer.name}`);
      await this.page.waitForFunction(
        (element) => {
          const profilePhoto = element as HTMLImageElement;
          return profilePhoto.complete && profilePhoto.naturalWidth > 0;
        },
        imageHandle,
      );
      assert.equal(await image.getAttribute("src"), consumer.photoUrl);
    }
  },
);

Then(
  "cada imagen tiene un texto alternativo que identifica al consumidor",
  async function (this: CustomWorld) {
    const list = this.page.getByRole("list", { name: "Lista de conversaciones" });
    for (const consumer of photoConsumers) {
      const item = list.getByRole("listitem").filter({
        has: this.page.getByText(`${consumer.name} ${consumer.surname}`, { exact: true }),
      });
      const alt = await item.getByTestId("chat-list-profile-photo").getAttribute("alt");
      assert.ok(alt?.includes(consumer.name), `El texto alternativo no identifica a ${consumer.name}`);
    }
  },
);

Then(
  "esa conversación muestra el avatar de respaldo y el nombre del consumidor",
  async function (this: CustomWorld) {
    const item = this.page
      .getByRole("list", { name: "Lista de conversaciones" })
      .getByRole("listitem")
      .filter({ has: this.page.getByText("María Fernández", { exact: true }) });
    assert.equal(await item.count(), 1, "No aparece la conversación del consumidor");
    assert.ok(await item.getByText("María Fernández", { exact: true }).isVisible());
    assert.ok(await item.getByRole("img", { name: "Foto de María" }).isVisible());
    assert.equal(await item.getByTestId("chat-list-profile-photo").count(), 0);
  },
);
