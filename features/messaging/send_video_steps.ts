import { Given, Then, When } from "@cucumber/cucumber";
import assert from "assert";
import { APP_URL, CustomWorld, visibleTimeout } from "../support/world";
import {
  aConversation,
  aConversationDetail,
  aConversationMessage,
  aCounterpart,
  aWsTicket,
} from "../support/factories";
import { ROUTES } from "../../lib/routes";

interface VideoFixtureInfo {
  name: string;
  sound?: string;
  bytes?: number;
  duration?: number;
  width?: number;
  height?: number;
}

interface VideoWorld extends CustomWorld {
  videoFixtures?: Record<string, VideoFixtureInfo>;
  currentVideoFileName?: string;
}

async function stubActiveVideoChat(world: CustomWorld) {
  await world.setSession("consumer", {
    id: "consumer-001",
    email: "ana@example.com",
    firstName: "Ana",
    lastName: "Pérez",
    isOnboarded: true,
  });

  await world.stubGet("/conversations", [
    aConversation({
      id: 1,
      status: "accepted",
      counterpart: aCounterpart({
        id: 1,
        role: "provider",
        name: "Juan",
        surname: "Gómez",
      }),
    }),
  ]);

  await world.stubGet(
    "/conversations/1",
    aConversationDetail({
      id: 1,
      status: "accepted",
      counterpart: aCounterpart({
        id: 1,
        role: "provider",
        name: "Juan",
        surname: "Gómez",
      }),
      messages: [
        aConversationMessage({
          id: 1,
          sender_role: "consumer",
          content: "Hola Juan",
        }),
      ],
    })
  );

  await world.stubGet("/job-requests", []);
  await world.stubGet("/service-proposals", []);
  await world.stubPost("/ws-tickets", 201, aWsTicket());
}

async function openActiveVideoChat(world: CustomWorld) {
  await stubActiveVideoChat(world);
  await world.page.goto(
    APP_URL + ROUTES.consumer.messages + "?provider_id=1&name=Juan&surname=Gómez",
    { waitUntil: "networkidle" }
  );
  await world.page.locator('[data-testid="messages-list"]').waitFor(visibleTimeout);
}

async function attachVideoFile(world: VideoWorld, fileName: string, sizeBytes?: number) {
  const messageInput = world.page.getByPlaceholder("Escribe un mensaje...");
  await messageInput.waitFor({ state: "visible", timeout: 5000 });

  const videoInput = world.page.locator('input[accept="video/mp4"]');
  await videoInput.waitFor({ state: "attached", timeout: 5000 });

  const byteCount = sizeBytes ?? 1024;
  const bufferLength = Math.min(byteCount, 1024);

  await videoInput.setInputFiles({
    name: fileName,
    mimeType: "video/mp4",
    buffer: Buffer.alloc(bufferLength, 1),
  });

  const preview = world.page.getByTestId("video-preview");
  await preview.waitFor(visibleTimeout);
}

Given("que estoy en un chat activo y abrí el menú de adjuntos", async function (this: CustomWorld) {
  await openActiveVideoChat(this);
  const openMenuButton = this.page.getByRole("button", { name: "Abrir menú de acciones" });
  await openMenuButton.waitFor({ state: "visible", timeout: 5000 });
  const menu = this.page.getByRole("menu");
  await openMenuButton.click();
  try {
    await menu.waitFor({ state: "visible", timeout: 2000 });
  } catch {
    await openMenuButton.click();
    await menu.waitFor(visibleTimeout);
  }
});

Given(
  "que el video {string} es MP4 H.264 con {string}",
  async function (this: VideoWorld, fileName: string, sound: string) {
    this.videoFixtures = this.videoFixtures || {};
    this.videoFixtures[fileName] = {
      ...(this.videoFixtures[fileName] || { name: fileName }),
      sound,
    };
    this.currentVideoFileName = fileName;
  }
);

Given(
  "que tiene {int} bytes, {int} segundos y dimensiones {int} por {int} píxeles",
  async function (this: VideoWorld, bytes: number, duration: number, width: number, height: number) {
    const fileName = this.currentVideoFileName || "perdida.mp4";
    this.videoFixtures = this.videoFixtures || {};
    this.videoFixtures[fileName] = {
      ...(this.videoFixtures[fileName] || { name: fileName }),
      bytes,
      duration,
      width,
      height,
    };

    await this.page.evaluate(
      ({ name, dur, w, h }) => {
        const wnd = window as unknown as {
          __e2eVideoMetadata?: Record<string, { duration: number; width: number; height: number }>;
        };
        wnd.__e2eVideoMetadata = wnd.__e2eVideoMetadata || {};
        wnd.__e2eVideoMetadata[name] = { duration: dur, width: w, height: h };
      },
      { name: fileName, dur: duration, w: width, h: height }
    );
  }
);

When("selecciono el video {string}", async function (this: VideoWorld, fileName: string) {
  const fixture = this.videoFixtures?.[fileName];
  await attachVideoFile(this, fileName, fixture?.bytes);
});

Then("veo su miniatura, nombre y duración en la vista previa", async function (this: VideoWorld) {
  const preview = this.page.getByTestId("video-preview");
  await preview.waitFor(visibleTimeout);
  assert.ok(await preview.isVisible());

  const fileName = this.currentVideoFileName || "perdida.mp4";
  const nameElement = preview.getByText(fileName);
  assert.ok(await nameElement.isVisible());

  const thumbnail = preview.getByTestId("video-preview-player");
  await thumbnail.waitFor({ state: "attached", timeout: 5000 });

  const fixture = this.videoFixtures?.[fileName];
  if (fixture?.duration !== undefined) {
    const mins = Math.floor(fixture.duration / 60);
    const secs = String(fixture.duration % 60).padStart(2, "0");
    const expectedDuration = `${mins}:${secs}`;
    const durationElement = preview.getByText(expectedDuration);
    assert.ok(await durationElement.isVisible());
  }
});

Then("puedo escribir un texto para acompañarlo", async function (this: CustomWorld) {
  const input = this.page.getByPlaceholder("Escribe un mensaje...");
  await input.waitFor(visibleTimeout);
  assert.ok(await input.isEnabled());
  await input.fill("Texto de prueba");
  assert.strictEqual(await input.inputValue(), "Texto de prueba");
});

Given(
  "que tengo seleccionado {string} con el texto {string}",
  async function (this: VideoWorld, fileName: string, text: string) {
    await openActiveVideoChat(this);
    await this.page.evaluate(
      ({ name }) => {
        const wnd = window as unknown as {
          __e2eVideoMetadata?: Record<string, { duration: number; width: number; height: number }>;
        };
        wnd.__e2eVideoMetadata = wnd.__e2eVideoMetadata || {};
        wnd.__e2eVideoMetadata[name] = { duration: 17, width: 1920, height: 1080 };
      },
      { name: fileName }
    );

    this.currentVideoFileName = fileName;
    await attachVideoFile(this, fileName, 1048576);

    const input = this.page.getByPlaceholder("Escribe un mensaje...");
    await input.fill(text);
  }
);

When("quito el video de la vista previa", async function (this: CustomWorld) {
  const removeButton = this.page.getByRole("button", { name: "Quitar video de la vista previa" });
  await removeButton.click();
});

Then("desaparece la vista previa del video", async function (this: CustomWorld) {
  await this.page.getByTestId("video-preview").waitFor({ state: "detached", timeout: 5000 });
  assert.strictEqual(await this.page.getByTestId("video-preview").count(), 0);
});

Then("se conserva el texto {string}", async function (this: CustomWorld, text: string) {
  const input = this.page.getByPlaceholder("Escribe un mensaje...");
  await input.waitFor(visibleTimeout);
  assert.strictEqual(await input.inputValue(), text);
});

Then("no se crea ningún mensaje de video", async function (this: CustomWorld) {
  const videoBubbles = this.page.locator('[data-testid="messages-list"] [data-testid="video-bubble"]');
  assert.strictEqual(await videoBubbles.count(), 0);
});

When(
  "selecciono otro video permitido llamado {string}",
  async function (this: VideoWorld, fileName: string) {
    await this.page.evaluate(
      ({ name }) => {
        const wnd = window as unknown as {
          __e2eVideoMetadata?: Record<string, { duration: number; width: number; height: number }>;
        };
        wnd.__e2eVideoMetadata = wnd.__e2eVideoMetadata || {};
        wnd.__e2eVideoMetadata[name] = { duration: 17, width: 1920, height: 1080 };
      },
      { name: fileName }
    );

    this.currentVideoFileName = fileName;
    const videoInput = this.page.locator('input[accept="video/mp4"]');
    await videoInput.setInputFiles({
      name: fileName,
      mimeType: "video/mp4",
      buffer: Buffer.alloc(1024, 1),
    });
  }
);

Then(
  "la vista previa muestra únicamente {string}",
  async function (this: CustomWorld, fileName: string) {
    const preview = this.page.getByTestId("video-preview");
    await preview.waitFor(visibleTimeout);
    assert.ok(await preview.getByText(fileName).isVisible());
    assert.strictEqual(await preview.getByText("perdida.mp4").count(), 0);
  }
);

Then("todavía no se ha enviado ningún video", async function (this: CustomWorld) {
  const videoBubbles = this.page.locator('[data-testid="messages-list"] [data-testid="video-bubble"]');
  assert.strictEqual(await videoBubbles.count(), 0);
});
