import { After, Given, Then, When } from "@cucumber/cucumber";
import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { APP_URL, CustomWorld, visibleTimeout } from "../support/world";
import {
  aConversation,
  aConversationDetail,
  aConversationMessage,
  aCounterpart,
  aWsTicket,
} from "../support/factories";
import { ROUTES } from "../../lib/routes";
import { installMediaRecorderMock } from "./send_audio_steps";

interface VideoFixtureInfo {
  name: string;
  sound?: string;
  bytes?: number;
  duration?: number;
  width?: number;
  height?: number;
}

interface InvalidFileSpec {
  name: string;
  mimeType: string;
  sizeBytes: number;
  duration?: number;
  width?: number;
  height?: number;
  corrupted?: boolean;
}

interface VideoWorld extends CustomWorld {
  videoFixtures?: Record<string, VideoFixtureInfo>;
  currentVideoFileName?: string;
  invalidVideoSpec?: InvalidFileSpec;
  tempVideoPath?: string;
  currentActualAttachment?: string;
  currentNuevoAttachment?: string;
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
  await installMediaRecorderMock(world);
  await world.page.goto(
    APP_URL + ROUTES.consumer.messages + "?provider_id=1&name=Juan&surname=Gómez",
    { waitUntil: "networkidle" }
  );
  await world.page.locator('[data-testid="messages-list"]').waitFor(visibleTimeout);
}

async function attachVideoFile(world: VideoWorld, fileName: string, sizeBytes?: number) {
  await world.page.evaluate(
    ({ name }) => {
      const wnd = window as Window & {
        __e2eVideoMetadata?: Record<string, { duration: number; width: number; height: number }>;
      };
      wnd.__e2eVideoMetadata = wnd.__e2eVideoMetadata || {};
      if (!wnd.__e2eVideoMetadata[name]) {
        wnd.__e2eVideoMetadata[name] = { duration: 17, width: 1920, height: 1080 };
      }
    },
    { name: fileName }
  );

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

Given("que estoy en un chat activo con un borrador de texto", async function (this: CustomWorld) {
  await openActiveVideoChat(this);
  const input = this.page.getByPlaceholder("Escribe un mensaje...");
  await input.waitFor(visibleTimeout);
  await input.fill("Mi borrador de texto");
});

Given("que el archivo seleccionado presenta {string}", async function (this: VideoWorld, problema: string) {
  let spec: InvalidFileSpec = {
    name: "archivo-invalido.mp4",
    mimeType: "video/mp4",
    sizeBytes: 1024,
    duration: 17,
    width: 1920,
    height: 1080,
  };

  switch (problema) {
    case "formato WebM":
      spec = { name: "video.webm", mimeType: "video/webm", sizeBytes: 1024, duration: 17, width: 1920, height: 1080 };
      break;
    case "archivo vacío":
      spec = { name: "vacio.mp4", mimeType: "video/mp4", sizeBytes: 0, duration: 17, width: 1920, height: 1080 };
      break;
    case "tamaño de 52428801 bytes":
      spec = { name: "pesado.mp4", mimeType: "video/mp4", sizeBytes: 52428801, duration: 17, width: 1920, height: 1080 };
      break;
    case "duración de 121 segundos":
      spec = { name: "largo.mp4", mimeType: "video/mp4", sizeBytes: 1024, duration: 121, width: 1920, height: 1080 };
      break;
    case "ancho de 1921 píxeles":
      spec = { name: "ancho.mp4", mimeType: "video/mp4", sizeBytes: 1024, duration: 17, width: 1921, height: 1080 };
      break;
    case "alto de 1921 píxeles":
      spec = { name: "alto.mp4", mimeType: "video/mp4", sizeBytes: 1024, duration: 17, width: 1080, height: 1921 };
      break;
    case "archivo dañado o ilegible":
      spec = { name: "danado.mp4", mimeType: "video/mp4", sizeBytes: 1024, corrupted: true };
      break;
    case "duración desconocida o inválida":
      spec = { name: "duracion-invalida.mp4", mimeType: "video/mp4", sizeBytes: 1024, duration: 0, width: 1920, height: 1080 };
      break;
    default:
      throw new Error(`Problema no reconocido: ${problema}`);
  }

  this.invalidVideoSpec = spec;

  await this.page.evaluate(
    ({ spec }) => {
      const wnd = window as unknown as {
        __e2eVideoMetadata?: Record<string, { duration?: number; width?: number; height?: number; shouldFail?: boolean }>;
      };
      wnd.__e2eVideoMetadata = wnd.__e2eVideoMetadata || {};
      if (spec.corrupted) {
        wnd.__e2eVideoMetadata[spec.name] = { shouldFail: true, duration: 0, width: 0, height: 0 };
      } else {
        wnd.__e2eVideoMetadata[spec.name] = {
          duration: spec.duration ?? 17,
          width: spec.width ?? 1920,
          height: spec.height ?? 1080,
        };
      }
    },
    { spec }
  );
});

When("intento adjuntar el archivo", async function (this: VideoWorld) {
  const spec = this.invalidVideoSpec;
  if (!spec) throw new Error("No hay especificación de archivo inválido");

  const videoInput = this.page.locator('input[accept="video/mp4"]');
  await videoInput.waitFor({ state: "attached", timeout: 5000 });

  if (spec.sizeBytes > 50 * 1024 * 1024) {
    const tempFilePath = path.join(os.tmpdir(), `test-video-${Date.now()}-${spec.name}`);
    const fd = fs.openSync(tempFilePath, "w");
    fs.ftruncateSync(fd, spec.sizeBytes);
    fs.closeSync(fd);
    this.tempVideoPath = tempFilePath;
    await videoInput.setInputFiles(tempFilePath);
  } else {
    await videoInput.setInputFiles({
      name: spec.name,
      mimeType: spec.mimeType,
      buffer: Buffer.alloc(spec.sizeBytes, 1),
    });
  }
});

Then("veo un mensaje en español que indica {string}", async function (this: CustomWorld, motivo: string) {
  const errorNotice = this.page.locator("div.text-red-500");
  await errorNotice.waitFor(visibleTimeout);
  const text = (await errorNotice.textContent()) || "";
  assert.ok(
    text.toLowerCase().includes(motivo.toLowerCase()),
    `Mensaje esperado "${motivo}" no encontrado en "${text}"`
  );
});

Then("el archivo no queda disponible para enviar", async function (this: CustomWorld) {
  const preview = this.page.getByTestId("video-preview");
  assert.strictEqual(await preview.count(), 0);
});

Then("se conserva mi borrador de texto", async function (this: CustomWorld) {
  const input = this.page.getByPlaceholder("Escribe un mensaje...");
  await input.waitFor(visibleTimeout);
  assert.strictEqual(await input.inputValue(), "Mi borrador de texto");
});

Then("puedo seleccionar otro video", async function (this: CustomWorld) {
  const videoInput = this.page.locator('input[accept="video/mp4"]');
  await videoInput.waitFor({ state: "attached", timeout: 5000 });
  assert.ok(await videoInput.isEnabled());
});

Given(
  "que estoy en un chat activo con {string} seleccionado y un borrador de texto",
  async function (this: VideoWorld, actual: string) {
    this.currentActualAttachment = actual;
    await openActiveVideoChat(this);

    if (actual === "video") {
      const input = this.page.getByPlaceholder("Escribe un mensaje...");
      await input.waitFor(visibleTimeout);
      await input.fill("Mi borrador de texto");

      await attachVideoFile(this, "actual.mp4");
      const preview = this.page.getByTestId("video-preview");
      await preview.waitFor(visibleTimeout);
    } else if (actual === "imagen") {
      const input = this.page.getByPlaceholder("Escribe un mensaje...");
      await input.waitFor(visibleTimeout);
      await input.fill("Mi borrador de texto");

      const fileInput = this.page.locator('input[accept="image/jpeg, image/png, image/webp"]');
      await fileInput.waitFor({ state: "attached", timeout: 5000 });
      await fileInput.setInputFiles({
        name: "perdida-actual.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from("mock-image-data"),
      });
      const thumbnail = this.page.getByRole("img", { name: "perdida-actual.jpg" });
      await thumbnail.waitFor(visibleTimeout);
    } else if (actual === "audio adjunto") {
      const audioInput = this.page.locator('input[accept="audio/webm"]');
      await audioInput.waitFor({ state: "attached", timeout: 5000 });
      await audioInput.setInputFiles({
        name: "ruido-actual.webm",
        mimeType: "audio/webm",
        buffer: Buffer.from("mock-audio-data"),
      });
      await this.page.getByTestId("audio-preview").waitFor(visibleTimeout);
    } else if (actual === "audio grabado") {
      const micBtn = this.page.getByRole("button", { name: "Grabar audio" });
      await micBtn.waitFor(visibleTimeout);
      await micBtn.click();
      await this.page.getByTestId("audio-recording").waitFor(visibleTimeout);
      await this.page.evaluate(() => {
        (window as Window & { __e2eStopRecording?: () => void }).__e2eStopRecording?.();
      });
      await this.page.getByTestId("audio-preview").waitFor(visibleTimeout);
    } else {
      throw new Error(`Adjunto actual desconocido: ${actual}`);
    }
  }
);

When("intento agregar {string}", async function (this: VideoWorld, nuevo: string) {
  this.currentNuevoAttachment = nuevo;
  if (nuevo === "video") {
    const videoInput = this.page.locator('input[accept="video/mp4"]');
    await videoInput.waitFor({ state: "attached", timeout: 5000 });
    await videoInput.setInputFiles({
      name: "incompatible.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("mock-video-data"),
    });
  } else if (nuevo === "imagen") {
    const fileInput = this.page.locator('input[accept="image/jpeg, image/png, image/webp"]');
    await fileInput.waitFor({ state: "attached", timeout: 5000 });
    await fileInput.setInputFiles({
      name: "incompatible.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("mock-image-data"),
    });
  } else if (nuevo === "audio adjunto") {
    const audioInput = this.page.locator('input[accept="audio/webm"]');
    await audioInput.waitFor({ state: "attached", timeout: 5000 });
    await audioInput.setInputFiles({
      name: "incompatible.webm",
      mimeType: "audio/webm",
      buffer: Buffer.from("mock-audio-data"),
    });
  } else if (nuevo === "audio grabado") {
    const trigger = this.page.locator('[data-testid="record-audio-trigger"]');
    if ((await trigger.count()) > 0) {
      await trigger.evaluate((btn: HTMLElement) => btn.click());
    } else {
      const micBtn = this.page.getByRole("button", { name: "Grabar audio" });
      if (await micBtn.isVisible().catch(() => false)) {
        await micBtn.click();
      }
    }
  } else {
    throw new Error(`Adjunto nuevo desconocido: ${nuevo}`);
  }
});

Then("veo que debo quitar el adjunto actual para agregar el nuevo", async function (this: CustomWorld) {
  const errorNotice = this.page.locator("div.text-red-500");
  await errorNotice.waitFor(visibleTimeout);
  const text = (await errorNotice.textContent()) || "";
  assert.ok(
    text.includes("Debes quitar el adjunto actual para agregar el nuevo") ||
    text.toLowerCase().includes("quitar el adjunto actual"),
    `Mensaje de incompatibilidad no encontrado en "${text}"`
  );
});

Then("se conservan el adjunto actual y mi borrador de texto", async function (this: VideoWorld) {
  const actual = this.currentActualAttachment;
  if (actual === "video") {
    const videoPreview = this.page.getByTestId("video-preview");
    assert.strictEqual(await videoPreview.count(), 1);
    const input = this.page.getByPlaceholder("Escribe un mensaje...");
    assert.strictEqual(await input.inputValue(), "Mi borrador de texto");
  } else if (actual === "imagen") {
    const imageThumbnail = this.page.getByRole("img", { name: "perdida-actual.jpg" });
    assert.ok((await imageThumbnail.count()) > 0);
    const input = this.page.getByPlaceholder("Escribe un mensaje...");
    assert.strictEqual(await input.inputValue(), "Mi borrador de texto");
  } else if (actual === "audio adjunto" || actual === "audio grabado") {
    const audioPreview = this.page.getByTestId("audio-preview");
    assert.strictEqual(await audioPreview.count(), 1);
  }
});

Then("no se agrega el adjunto incompatible", async function (this: VideoWorld) {
  const nuevo = this.currentNuevoAttachment;
  if (nuevo === "video") {
    const videoPreview = this.page.getByTestId("video-preview");
    assert.strictEqual(await videoPreview.count(), 0);
  } else if (nuevo === "imagen") {
    const incompatibleImg = this.page.getByRole("img", { name: "incompatible.jpg" });
    assert.strictEqual(await incompatibleImg.count(), 0);
  } else if (nuevo === "audio adjunto" || nuevo === "audio grabado") {
    const audioPreview = this.page.getByTestId("audio-preview");
    assert.strictEqual(await audioPreview.count(), 0);
  }
});

After(async function (this: VideoWorld) {
  if (this.tempVideoPath && fs.existsSync(this.tempVideoPath)) {
    try {
      fs.unlinkSync(this.tempVideoPath);
    } catch {
      // ignore
    }
  }
});
