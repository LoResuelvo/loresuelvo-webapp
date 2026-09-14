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
  aPresignedUpload,
  aConfirmedFile,
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
  currentRole?: "consumer" | "provider";
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
  const videoBubbles = this.page.locator('[data-testid="messages-list"] [data-testid="video-message-player"]');
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

Given(
  "que estoy autenticado como {string} en un chat activo",
  async function (this: VideoWorld, rol: string) {
    const isProvider = rol.toLowerCase().includes("prestador");
    this.currentRole = isProvider ? "provider" : "consumer";

    if (isProvider) {
      await this.setSession("provider", {
        id: "provider-001",
        email: "juan@example.com",
        firstName: "Juan",
        lastName: "Gómez",
        isOnboarded: true,
      });

      await this.stubGet("/conversations", [
        aConversation({
          id: 1,
          status: "accepted",
          counterpart: aCounterpart({
            id: 1,
            role: "consumer",
            name: "Ana",
            surname: "Pérez",
          }),
        }),
      ]);
      await this.stubGet(
        "/conversations/1",
        aConversationDetail({
          id: 1,
          status: "accepted",
          counterpart: aCounterpart({
            id: 1,
            role: "consumer",
            name: "Ana",
            surname: "Pérez",
          }),
          messages: [],
        })
      );
      await this.stubGet("/job-requests", []);
      await this.stubGet("/service-proposals", []);
      await this.stubPost("/ws-tickets", 201, aWsTicket());

      await this.page.goto(
        APP_URL + ROUTES.provider.messages + "?consumer_id=1",
        { waitUntil: "networkidle" }
      );
    } else {
      await this.setSession("consumer", {
        id: "consumer-001",
        email: "ana@example.com",
        firstName: "Ana",
        lastName: "Pérez",
        isOnboarded: true,
      });

      await this.stubGet("/conversations", [
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
      await this.stubGet(
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
          messages: [],
        })
      );
      await this.stubGet("/job-requests", []);
      await this.stubGet("/service-proposals", []);
      await this.stubPost("/ws-tickets", 201, aWsTicket());

      await this.page.goto(
        APP_URL + ROUTES.consumer.messages + "?provider_id=1&name=Juan&surname=Gómez",
        { waitUntil: "networkidle" }
      );
    }

    await this.page.locator('[data-testid="messages-list"]').waitFor(visibleTimeout);

    const fileId = isProvider ? "video-file-provider-001" : "video-file-001";
    const uploadUrl = `https://mock-upload.test/video-${fileId}`;

    await this.stubPost(
      "/files/presign",
      200,
      aPresignedUpload({
        file_id: fileId,
        key: `conversation_message_video/${fileId}`,
        upload_url: uploadUrl,
      })
    );
    await this.page.route(uploadUrl, async (route) => {
      await route.fulfill({ status: 204 });
    });
    await this.stubPost(
      `/files/${fileId}/confirm`,
      200,
      aConfirmedFile({
        id: fileId,
        url: "https://mock-video.test/perdida.mp4",
        original_name: "perdida.mp4",
      })
    );
    await this.stubPost("/conversations/1/messages", 201, {
      id: 101,
      sender_role: isProvider ? "provider" : "consumer",
      created_on: new Date().toISOString(),
      video: {
        id: fileId,
        url: "https://mock-video.test/perdida.mp4",
        original_name: "perdida.mp4",
        duration_seconds: 17,
        mime_type: "video/mp4",
      },
    });
  }
);

Given(
  "que tengo seleccionado un video permitido de 17 segundos con {string}",
  async function (this: VideoWorld, _sound: string) {
    const fileName = "video-17s.mp4";
    this.currentVideoFileName = fileName;
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
    await attachVideoFile(this, fileName, 1048576);
  }
);

Given(
  "que el campo de texto contiene {string}",
  async function (this: VideoWorld, texto: string) {
    if (texto && texto.trim().length > 0) {
      const input = this.page.getByPlaceholder("Escribe un mensaje...");
      await input.waitFor(visibleTimeout);
      await input.fill(texto);

      const isProvider = this.currentRole === "provider";
      const fileId = isProvider ? "video-file-provider-001" : "video-file-001";
      await this.stubPost("/conversations/1/messages", 201, {
        id: 101,
        sender_role: isProvider ? "provider" : "consumer",
        created_on: new Date().toISOString(),
        content: texto,
        video: {
          id: fileId,
          url: "https://mock-video.test/perdida.mp4",
          original_name: "perdida.mp4",
          duration_seconds: 17,
          mime_type: "video/mp4",
        },
      });
    }
  }
);

When("envío el mensaje", async function (this: CustomWorld) {
  const sendButton = this.page.getByRole("button", { name: /Enviar mensaje/i });
  await sendButton.waitFor(visibleTimeout);
  await sendButton.click();
});

Then(
  "veo un único mensaje propio con miniatura, botón de reproducción y duración {string}",
  async function (this: CustomWorld, duracion: string) {
    const messageList = this.page.locator('[data-testid="messages-list"]');
    const player = messageList.getByTestId("video-message-player");
    await player.waitFor(visibleTimeout);
    assert.strictEqual(await player.count(), 1);

    const thumbnail = player.getByTestId("video-thumbnail");
    assert.ok(await thumbnail.isVisible());

    const playButton = player.getByTestId("video-play-button");
    assert.ok(await playButton.isVisible());

    const durationBadge = player.getByTestId("video-duration");
    assert.strictEqual((await durationBadge.textContent())?.trim(), duracion);
  }
);

Then(
  "el mensaje muestra el texto {string} cuando no está vacío",
  async function (this: CustomWorld, texto: string) {
    if (texto && texto.trim().length > 0) {
      const messageList = this.page.locator('[data-testid="messages-list"]');
      const textEl = messageList.getByText(texto);
      await textEl.waitFor(visibleTimeout);
      assert.ok(await textEl.isVisible());
    }
  }
);

Then("se vacían el campo de texto y la selección de video", async function (this: CustomWorld) {
  const preview = this.page.getByTestId("video-preview");
  await preview.waitFor({ state: "detached", timeout: 10000 });
  assert.strictEqual(await preview.count(), 0);

  const input = this.page.getByPlaceholder("Escribe un mensaje...");
  await input.waitFor(visibleTimeout);
  let value = await input.inputValue();
  const start = Date.now();
  while (value !== "" && Date.now() - start < 5000) {
    await this.page.waitForTimeout(100);
    value = await input.inputValue();
  }
  assert.strictEqual(value, "");
});

// 50.2.7 Steps
Given("que tengo un video listo para enviar en un chat activo", async function (this: VideoWorld) {
  this.currentRole = "consumer";
  await openActiveVideoChat(this);
  const fileName = "video-ready.mp4";
  this.currentVideoFileName = fileName;
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
  await attachVideoFile(this, fileName, 1048576);
});

Given("que el envío tarda en completarse", async function (this: CustomWorld) {
  const fileId = "video-delayed-001";
  const uploadUrl = `https://mock-upload.test/delayed-video-${fileId}`;

  await this.stubPost(
    "/files/presign",
    200,
    aPresignedUpload({
      file_id: fileId,
      key: `conversation_message_video/${fileId}`,
      upload_url: uploadUrl,
    }),
    2500
  );
  await this.page.route(uploadUrl, async (route) => {
    await new Promise((r) => setTimeout(r, 2000));
    await route.fulfill({ status: 204 });
  });
  await this.stubPost(
    `/files/${fileId}/confirm`,
    200,
    aConfirmedFile({
      id: fileId,
      url: "https://mock-video.test/delayed.mp4",
      original_name: "video-ready.mp4",
    })
  );
  await this.stubPost("/conversations/1/messages", 201, {
    id: 101,
    sender_role: "consumer",
    created_on: new Date().toISOString(),
    video: {
      id: fileId,
      url: "https://mock-video.test/delayed.mp4",
      original_name: "video-ready.mp4",
      duration_seconds: 17,
      mime_type: "video/mp4",
    },
  });
});

Then("veo una indicación de que el envío está en curso", async function (this: CustomWorld) {
  const spinner = this.page.getByTestId("sending-spinner");
  await spinner.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await spinner.isVisible());
});

Then("no puedo iniciar otro envío mientras el actual está en curso", async function (this: CustomWorld) {
  const sendButton = this.page.getByTestId("message-send-button");
  assert.ok(await sendButton.isDisabled());
});

Then("el video todavía no aparece como enviado correctamente", async function (this: CustomWorld) {
  const messageList = this.page.locator('[data-testid="messages-list"]');
  assert.strictEqual(await messageList.locator('[data-testid="video-message-101"]').count(), 0);
});

// 50.2.8 Steps
Given(
  "que el servicio no puede enviar el mensaje debido a {string}",
  async function (this: VideoWorld, situacion: string) {
    const fileId = "video-fail-001";
    const uploadUrl = `https://mock-upload.test/fail-${fileId}`;

    if (situacion === "no se puede iniciar la carga") {
      await this.stubPost("/files/presign", 500, { error: "Presign failure" });
    } else if (situacion === "se interrumpe la transferencia") {
      await this.stubPost(
        "/files/presign",
        200,
        aPresignedUpload({
          file_id: fileId,
          key: `conversation_message_video/${fileId}`,
          upload_url: uploadUrl,
        })
      );
      await this.page.route(uploadUrl, async (route) => {
        await route.fulfill({ status: 500, body: "Upload network error" });
      });
    } else if (situacion === "no se puede completar la carga") {
      await this.stubPost(
        "/files/presign",
        200,
        aPresignedUpload({
          file_id: fileId,
          key: `conversation_message_video/${fileId}`,
          upload_url: uploadUrl,
        })
      );
      await this.page.route(uploadUrl, async (route) => {
        await route.fulfill({ status: 204 });
      });
      await this.stubPost(`/files/${fileId}/confirm`, 500, { error: "Confirm failed" });
    } else if (situacion === "el chat rechaza el envío") {
      await this.stubPost(
        "/files/presign",
        200,
        aPresignedUpload({
          file_id: fileId,
          key: `conversation_message_video/${fileId}`,
          upload_url: uploadUrl,
        })
      );
      await this.page.route(uploadUrl, async (route) => {
        await route.fulfill({ status: 204 });
      });
      await this.stubPost(
        `/files/${fileId}/confirm`,
        200,
        aConfirmedFile({
          id: fileId,
          url: "https://mock-video.test/fail.mp4",
          original_name: "perdida.mp4",
        })
      );
      await this.stubPost("/conversations/1/messages", 500, { error: "Chat rejected" });
    } else if (
      situacion === "el video MP4 usa un codec distinto de H.264" ||
      situacion === "la pista de audio usa un codec no permitido"
    ) {
      await this.stubPost(
        "/files/presign",
        200,
        aPresignedUpload({
          file_id: fileId,
          key: `conversation_message_video/${fileId}`,
          upload_url: uploadUrl,
        })
      );
      await this.page.route(uploadUrl, async (route) => {
        await route.fulfill({ status: 204 });
      });
      await this.stubPost(`/files/${fileId}/confirm`, 422, {
        error: "Invalid codec: H.264 and AAC required",
      });
    } else {
      throw new Error(`Situación no manejada: ${situacion}`);
    }
  }
);

Given("que la falla no crea un mensaje", async function (this: CustomWorld) {
  // Assumption step
});

When("intento enviar el mensaje", async function (this: CustomWorld) {
  const sendButton = this.page.getByRole("button", { name: /Enviar mensaje/i });
  await sendButton.waitFor(visibleTimeout);
  await sendButton.click();
});

Then("veo un error en español que explica {string}", async function (this: CustomWorld, motivo: string) {
  const errorNotice = this.page.locator("div.text-red-500");
  await errorNotice.waitFor(visibleTimeout);
  const text = (await errorNotice.textContent()) || "";
  assert.ok(
    text.toLowerCase().includes(motivo.toLowerCase()),
    `Error esperado "${motivo}" no encontrado en "${text}"`
  );
});

Then(
  "se conservan el video y el texto para reintentar o cambiar el archivo",
  async function (this: CustomWorld) {
    const preview = this.page.getByTestId("video-preview");
    await preview.waitFor(visibleTimeout);
    assert.strictEqual(await preview.count(), 1);

    const input = this.page.getByPlaceholder("Escribe un mensaje...");
    await input.waitFor(visibleTimeout);
    assert.strictEqual(await input.inputValue(), "La pérdida está aquí");
  }
);

Then("el campo de mensaje vuelve a estar habilitado", async function (this: CustomWorld) {
  const input = this.page.getByPlaceholder("Escribe un mensaje...");
  await input.waitFor(visibleTimeout);
  assert.ok(await input.isEnabled());

  const sendButton = this.page.getByTestId("message-send-button");
  assert.ok(await sendButton.isEnabled());
});

Then("no queda ningún mensaje marcado como enviado correctamente", async function (this: CustomWorld) {
  const messageList = this.page.locator('[data-testid="messages-list"]');
  const players = messageList.getByTestId("video-message-player");
  assert.strictEqual(await players.count(), 0);
});

// 50.2.9 Steps
Given(
  "que el primer envío del video y su texto falló sin crear un mensaje",
  async function (this: VideoWorld) {
    await openActiveVideoChat(this);
    const fileName = "perdida.mp4";
    this.currentVideoFileName = fileName;
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
    await attachVideoFile(this, fileName, 1048576);
    const input = this.page.getByPlaceholder("Escribe un mensaje...");
    await input.fill("La pérdida está aquí");

    await this.stubPost("/files/presign", 500, { error: "Network error" });

    const sendButton = this.page.getByRole("button", { name: /Enviar mensaje/i });
    await sendButton.click();

    const errorNotice = this.page.locator("div.text-red-500");
    await errorNotice.waitFor(visibleTimeout);
  }
);

Given(
  "que el borrador permanece disponible y la causa de la falla se resolvió",
  async function (this: CustomWorld) {
    const preview = this.page.getByTestId("video-preview");
    assert.strictEqual(await preview.count(), 1);

    const fileId = "video-retry-001";
    const uploadUrl = `https://mock-upload.test/retry-${fileId}`;

    await this.stubPost(
      "/files/presign",
      200,
      aPresignedUpload({
        file_id: fileId,
        key: `conversation_message_video/${fileId}`,
        upload_url: uploadUrl,
      })
    );
    await this.page.route(uploadUrl, async (route) => {
      await route.fulfill({ status: 204 });
    });
    await this.stubPost(
      `/files/${fileId}/confirm`,
      200,
      aConfirmedFile({
        id: fileId,
        url: "https://mock-video.test/perdida.mp4",
        original_name: "perdida.mp4",
      })
    );
    await this.stubPost("/conversations/1/messages", 201, {
      id: 201,
      sender_role: "consumer",
      created_on: new Date().toISOString(),
      content: "La pérdida está aquí",
      video: {
        id: fileId,
        url: "https://mock-video.test/perdida.mp4",
        original_name: "perdida.mp4",
        duration_seconds: 17,
        mime_type: "video/mp4",
      },
    });
  }
);

When("reintento enviar el mensaje", async function (this: CustomWorld) {
  const sendButton = this.page.getByRole("button", { name: /Enviar mensaje/i });
  await sendButton.waitFor(visibleTimeout);
  await sendButton.click();
});

Then("veo un único mensaje enviado con el video y su texto", async function (this: CustomWorld) {
  const messageList = this.page.locator('[data-testid="messages-list"]');
  const player = messageList.getByTestId("video-message-player");
  await player.waitFor(visibleTimeout);
  assert.strictEqual(await player.count(), 1);

  const textEl = messageList.getByText("La pérdida está aquí");
  await textEl.waitFor(visibleTimeout);
  assert.ok(await textEl.isVisible());
});

// 50.2.10 Steps
Given(
  "que el chat contiene un video de 17 segundos {string} con el texto {string}",
  async function (this: VideoWorld, origen: string, texto: string) {
    const isOwn = origen === "enviado por mí";
    this.currentRole = "consumer";

    await this.setSession("consumer", {
      id: "consumer-001",
      email: "ana@example.com",
      firstName: "Ana",
      lastName: "Pérez",
      isOnboarded: true,
    });

    const fileId = "video-historical-001";
    const videoUrl = "https://mock-video.test/historical.mp4";

    const msg: any = {
      id: 301,
      sender_role: isOwn ? "consumer" : "provider",
      created_on: new Date().toISOString(),
      content: texto || "",
      video: {
        id: fileId,
        url: videoUrl,
        original_name: "perdida.mp4",
        duration_seconds: 17,
        mime_type: "video/mp4",
      },
    };

    await this.stubGet("/conversations", [
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
    await this.stubGet(
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
        messages: [msg],
      })
    );
    await this.stubGet("/job-requests", []);
    await this.stubGet("/service-proposals", []);
    await this.stubPost("/ws-tickets", 201, aWsTicket());
  }
);

When("abro nuevamente ese chat", async function (this: CustomWorld) {
  await this.page.goto(
    APP_URL + ROUTES.consumer.messages + "?provider_id=1&name=Juan&surname=Gómez",
    { waitUntil: "networkidle" }
  );
  await this.page.locator('[data-testid="messages-list"]').waitFor(visibleTimeout);
});

Then(
  "veo el video como mensaje {string} con miniatura, botón de reproducción y duración {string}",
  async function (this: CustomWorld, tipo: string, duracion: string) {
    const messageList = this.page.locator('[data-testid="messages-list"]');
    const bubble = messageList.locator(`[data-message-type="${tipo}"]`).first();
    await bubble.waitFor(visibleTimeout);
    assert.ok(await bubble.isVisible());

    const player = bubble.getByTestId("video-message-player");
    await player.waitFor(visibleTimeout);
    assert.ok(await player.isVisible());

    const thumbnail = player.getByTestId("video-thumbnail");
    assert.ok(await thumbnail.isVisible());

    const playButton = player.getByTestId("video-play-button");
    assert.ok(await playButton.isVisible());

    const durationBadge = player.getByTestId("video-duration");
    assert.strictEqual((await durationBadge.textContent())?.trim(), duracion);
  }
);

Then(
  "se muestra el texto {string} cuando no está vacío",
  async function (this: CustomWorld, texto: string) {
    if (texto && texto.trim().length > 0) {
      const messageList = this.page.locator('[data-testid="messages-list"]');
      const textEl = messageList.getByText(texto);
      await textEl.waitFor(visibleTimeout);
      assert.ok(await textEl.isVisible());
    }
  }
);

Then("el video no comienza a reproducirse automáticamente", async function (this: CustomWorld) {
  const messageList = this.page.locator('[data-testid="messages-list"]');
  const video = messageList.locator("video").first();
  await video.waitFor(visibleTimeout);
  const isPaused = await video.evaluate((v: HTMLVideoElement) => v.paused);
  assert.strictEqual(isPaused, true);
});

const MOCK_VALID_MP4_BASE64 =
  "AAAAJGZ0eXBpc29tAAACAGlzb21pc282aXNvMmF2YzFtcDQxAAAC7G1vb3YAAABsbXZoZAAAAAAAAAAAAAAAAAAAA+gAAAAAAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAHvdHJhawAAAFx0a2hkAAAAAwAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAQAAAAEAAAAAABi21kaWEAAAAgbWRoZAAAAAAAAAAAAAAAAAAAMgAAAAAAVcQAAAAAAC1oZGxyAAAAAAAAAAB2aWRlAAAAAAAAAAAAAAAAVmlkZW9IYW5kbGVyAAAAATZtaW5mAAAAFHZtaGQAAAABAAAAAAAAAAAAAAAkZGluZgAAABxkcmVmAAAAAAAAAAEAAAAMdXJsIAAAAAEAAAD2c3RibAAAAKpzdHNkAAAAAAAAAAEAAACaYXZjMQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAQABAASAAAAEgAAAAAAAAAARVMYXZjNjEuMTkuMTAxIGxpYngyNjQAAAAAAAAAAAAAABj//wAAADRhdmNDAWQACv/hABdnZAAKrNlewEQAAAMABAAAAwDIPEiWWAEABmjr48siwP34+AAAAAAQcGFzcAAAAAEAAAABAAAAEHN0dHMAAAAAAAAAAAAAABBzdHNjAAAAAAAAAAAAAAAUc3RzegAAAAAAAAAAAAAAAAAAABBzdGNvAAAAAAAAAAAAAAAobXZleAAAACB0cmV4AAAAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAAYXVkdGEAAABZbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAbWRpcmFwcGwAAAAAAAAAAAAAAAAsaWxzdAAAACSpdG9vAAAAHGRhdGEAAAABAAAAAExhdmY2MS43LjEwMwAAAThtb29mAAAAEG1maGQAAAAAAAAAAQAAASB0cmFmAAAAJHRmaGQAAAA5AAAAAQAAAAAAAAMQAAACAAAAAsUBAQAAAAAAFHRmZHQBAAAAAAAAAAAAAAAAAADgdHJ1bgAACgUAAAAZAAABQAIAAAAAAALFAAAEAAAAAAwAAAoAAAAADAAABAAAAAAMAAAAAAAAAAwAAAIAAAAAEgAACgAAAAAOAAAEAAAAAAwAAAAAAAAADAAAAgAAAAASAAAKAAAAAA4AAAQAAAAADAAAAAAAAAAMAAACAAAAABIAAAoAAAAADgAABAAAAAAMAAAAAAAAAAwAAAIAAAAAEgAACgAAAAAOAAAEAAAAAAwAAAAAAAAADAAAAgAAAAASAAAKAAAAAA4AAAQAAAAADAAAAAAAAAAMAAACAAAABBVtZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE2NCByMzEwOCAzMWUxOWY5IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAyMyAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTEgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTI1IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAAD2WIhAA7//73Tr8Cm1TCYQAAAAhBmiRsQ7/+4AAAAAhBnkJ4hf/BgQAAAAgBnmF0Qr/EgAAAAAgBnmNqQr/EgQAAAA5BmmhJqEFomUwId//+4QAAAApBnoZFESwv/8GBAAAACAGepXRCv8SBAAAACAGep2pCv8SAAAAADkGarEmoQWyZTAh3//7gAAAACkGeykUVLC//wYEAAAAIAZ7pdEK/xIAAAAAIAZ7rakK/xIAAAAAOQZrwSahBbJlMCG///uEAAAAKQZ8ORRUsL//BgQAAAAgBny10Qr/EgQAAAAgBny9qQr/EgAAAAA5BmzRJqEFsmUwIZ//+4AAAAApBn1JFFSwv/8GBAAAACAGfcXRCv8SAAAAACAGfc2pCv8SAAAAADkGbeEmoQWyZTAhX//7BAAAACkGflkUVLC//wYAAAAAIAZ+1dEK/xIEAAAAIAZ+3akK/xIEAAABDbWZyYQAAACt0ZnJhAQAAAAAAAAEAAAAAAAAAAQAAAAAAAAQAAAAAAAAAAxABAQEAAAAQbWZybwAAAAAAAABD";

const MOCK_VALID_MP4_BUFFER = Buffer.from(MOCK_VALID_MP4_BASE64, "base64");

async function stubPlayableVideoRoute(page: CustomWorld["page"]) {
  await page.unroute("**/mock-video.test/**").catch(() => {});
  await page.route("**/mock-video.test/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "video/mp4",
      body: MOCK_VALID_MP4_BUFFER,
    });
  });
}

// 50.2.11 Steps
Given(
  "que veo un video {string} que se puede reproducir",
  async function (this: VideoWorld, orientacion: string) {
    const isVertical = orientacion === "vertical";
    const width = isVertical ? 1080 : 1920;
    const height = isVertical ? 1920 : 1080;

    await this.setSession("consumer", {
      id: "consumer-001",
      email: "ana@example.com",
      firstName: "Ana",
      lastName: "Pérez",
      isOnboarded: true,
    });

    const fileId = "video-orientation-001";
    const videoUrl = "https://mock-video.test/orientation.mp4";

    const msg: any = {
      id: 401,
      sender_role: "consumer",
      created_on: new Date().toISOString(),
      content: "",
      video: {
        id: fileId,
        url: videoUrl,
        original_name: "video.mp4",
        duration_seconds: 17,
        width,
        height,
        mime_type: "video/mp4",
      },
    };

    await this.stubGet("/conversations", [
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
    await this.stubGet(
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
        messages: [msg],
      })
    );
    await this.stubGet("/job-requests", []);
    await this.stubGet("/service-proposals", []);
    await this.stubPost("/ws-tickets", 201, aWsTicket());

    await stubPlayableVideoRoute(this.page);

    await this.page.goto(
      APP_URL + ROUTES.consumer.messages + "?provider_id=1&name=Juan&surname=Gómez",
      { waitUntil: "networkidle" }
    );
    await this.page.locator('[data-testid="messages-list"]').waitFor(visibleTimeout);
  }
);

Given("que uso una pantalla {string}", async function (this: CustomWorld, pantalla: string) {
  if (pantalla === "mobile angosta") {
    await this.page.setViewportSize({ width: 360, height: 640 });
  } else if (pantalla === "tablet") {
    await this.page.setViewportSize({ width: 768, height: 1024 });
  } else {
    await this.page.setViewportSize({ width: 1440, height: 900 });
  }
});

When("activo el botón de reproducción del video", async function (this: CustomWorld) {
  const playButton = this.page.getByTestId("video-play-button").first();
  await playButton.waitFor(visibleTimeout);
  await playButton.focus();
  await playButton.click();
});

Then("se abre un visor amplio sobre fondo oscuro", async function (this: CustomWorld) {
  const viewer = this.page.getByTestId("video-viewer-modal");
  await viewer.waitFor(visibleTimeout);
  assert.ok(await viewer.isVisible());
});

Then(
  "puedo reproducir, pausar, avanzar y ajustar el volumen con los controles del video",
  async function (this: CustomWorld) {
    const viewer = this.page.getByTestId("video-viewer-modal");
    const video = viewer.locator("video");
    await video.waitFor(visibleTimeout);
    const hasControls = await video.evaluate((v: HTMLVideoElement) => v.controls);
    assert.strictEqual(hasControls, true);
    const playsInline = await video.evaluate((v: HTMLVideoElement) => v.playsInline);
    assert.strictEqual(playsInline, true);
  }
);

Then("veo el video completo conservando su proporción", async function (this: CustomWorld) {
  const viewer = this.page.getByTestId("video-viewer-modal");
  const video = viewer.locator("video");
  await video.waitFor(visibleTimeout);
  const className = await video.getAttribute("class");
  assert.ok(className?.includes("object-contain"), "El video no tiene object-contain");
});

Then(
  "los controles y el cierre quedan accesibles sin desplazamiento horizontal",
  async function (this: CustomWorld) {
    const hasHorizontalOverflow = await this.page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    assert.strictEqual(hasHorizontalOverflow, false, "Hay desplazamiento horizontal");

    const closeButton = this.page.getByRole("button", { name: /Cerrar visor/i }).first();
    await closeButton.waitFor(visibleTimeout);
    assert.ok(await closeButton.isVisible());
  }
);

// 50.2.12 Steps
Given("que abrí el visor desde el botón de un video", async function (this: CustomWorld) {
  await this.setSession("consumer", {
    id: "consumer-001",
    email: "ana@example.com",
    firstName: "Ana",
    lastName: "Pérez",
    isOnboarded: true,
  });

  const msg: any = {
    id: 501,
    sender_role: "consumer",
    created_on: new Date().toISOString(),
    content: "",
    video: {
      id: "video-close-001",
      url: "https://mock-video.test/video-close.mp4",
      original_name: "video.mp4",
      duration_seconds: 17,
      mime_type: "video/mp4",
    },
  };

  await this.stubGet("/conversations", [
    aConversation({
      id: 1,
      status: "accepted",
      counterpart: aCounterpart({ id: 1, role: "provider", name: "Juan", surname: "Gómez" }),
    }),
  ]);
  await this.stubGet(
    "/conversations/1",
    aConversationDetail({
      id: 1,
      status: "accepted",
      counterpart: aCounterpart({ id: 1, role: "provider", name: "Juan", surname: "Gómez" }),
      messages: [msg],
    })
  );
  await this.stubGet("/job-requests", []);
  await this.stubGet("/service-proposals", []);
  await this.stubPost("/ws-tickets", 201, aWsTicket());

  await stubPlayableVideoRoute(this.page);

  await this.page.goto(
    APP_URL + ROUTES.consumer.messages + "?provider_id=1&name=Juan&surname=Gómez",
    { waitUntil: "networkidle" }
  );
  const playButton = this.page.getByTestId("video-play-button").first();
  await playButton.waitFor(visibleTimeout);
  await playButton.focus();
  await playButton.click();

  const viewer = this.page.getByTestId("video-viewer-modal");
  await viewer.waitFor(visibleTimeout);
});

Given("que el video está reproduciéndose", async function (this: CustomWorld) {
  const viewer = this.page.getByTestId("video-viewer-modal");
  const video = viewer.locator("video");
  await video.waitFor(visibleTimeout);
  await video.evaluate((v: HTMLVideoElement) => {
    Object.defineProperty(v, "paused", { value: false, configurable: true });
  });
});

When("cierro el visor usando {string}", async function (this: CustomWorld, accion: string) {
  if (accion === "botón de cerrar") {
    const closeBtn = this.page.getByRole("button", { name: /Cerrar visor/i }).first();
    await closeBtn.waitFor(visibleTimeout);
    await closeBtn.click();
  } else if (accion === "tecla Escape") {
    await this.page.keyboard.press("Escape");
  }
});

Then(
  "desaparece el visor y deja de escucharse o reproducirse el video",
  async function (this: CustomWorld) {
    const viewer = this.page.getByTestId("video-viewer-modal");
    await viewer.waitFor({ state: "detached", timeout: 5000 });
    assert.strictEqual(await viewer.count(), 0);
  }
);

Then("el foco vuelve al botón que abrió el visor", async function (this: CustomWorld) {
  const playButton = this.page.getByTestId("video-play-button").first();
  const isFocused = await playButton.evaluate((btn) => document.activeElement === btn);
  assert.ok(isFocused, "El foco no volvió al botón que abrió el visor");
});

// 50.2.13 Steps
Given("que veo la tarjeta de un video del chat", async function (this: VideoWorld) {
  await this.setSession("consumer", {
    id: "consumer-001",
    email: "ana@example.com",
    firstName: "Ana",
    lastName: "Pérez",
    isOnboarded: true,
  });

  const fileId = "video-error-001";
  const videoUrl = "https://mock-video.test/error-video.mp4";

  const msg: any = {
    id: 601,
    sender_role: "consumer",
    created_on: new Date().toISOString(),
    content: "",
    video: {
      id: fileId,
      url: videoUrl,
      original_name: "video.mp4",
      duration_seconds: 17,
      mime_type: "video/mp4",
    },
  };

  await this.stubGet("/conversations", [
    aConversation({
      id: 1,
      status: "accepted",
      counterpart: aCounterpart({ id: 1, role: "provider", name: "Juan", surname: "Gómez" }),
    }),
  ]);
  await this.stubGet(
    "/conversations/1",
    aConversationDetail({
      id: 1,
      status: "accepted",
      counterpart: aCounterpart({ id: 1, role: "provider", name: "Juan", surname: "Gómez" }),
      messages: [msg],
    })
  );
  await this.stubGet("/job-requests", []);
  await this.stubGet("/service-proposals", []);
  await this.stubPost("/ws-tickets", 201, aWsTicket());

  await this.page.goto(
    APP_URL + ROUTES.consumer.messages + "?provider_id=1&name=Juan&surname=Gómez",
    { waitUntil: "networkidle" }
  );
  await this.page.locator('[data-testid="messages-list"]').waitFor(visibleTimeout);
});

Given(
  "que el video no se puede reproducir por {string}",
  async function (this: CustomWorld, _problema: string) {
    await this.page.unroute("**/mock-video.test/**").catch(() => {});
    await this.page.route("**/mock-video.test/**", async (route) => {
      await route.abort("failed");
    });
  }
);

When("abro el video", async function (this: CustomWorld) {
  const playButton = this.page.getByTestId("video-play-button").first();
  await playButton.waitFor(visibleTimeout);
  await playButton.click();
});

Then(
  "veo un mensaje en español indicando que no se pudo cargar o reproducir el video",
  async function (this: CustomWorld) {
    const errorNotice = this.page.getByTestId("video-playback-error");
    await errorNotice.waitFor(visibleTimeout);
    const text = (await errorNotice.textContent()) || "";
    assert.ok(
      text.toLowerCase().includes("no se pudo cargar o reproducir el video"),
      `Texto "${text}" no contiene el mensaje esperado`
    );
  }
);

Then("puedo reintentar o cerrar el visor", async function (this: CustomWorld) {
  const retryButton = this.page.getByTestId("video-retry-button");
  await retryButton.waitFor(visibleTimeout);
  assert.ok(await retryButton.isVisible());

  const closeButton = this.page.getByTestId("video-close-button");
  await closeButton.waitFor(visibleTimeout);
  assert.ok(await closeButton.isVisible());
});

// 50.2.14 Steps
Given("que el visor muestra un error de reproducción", async function (this: VideoWorld) {
  await this.setSession("consumer", {
    id: "consumer-001",
    email: "ana@example.com",
    firstName: "Ana",
    lastName: "Pérez",
    isOnboarded: true,
  });

  const fileId = "video-retry-playback-001";
  const videoUrl = "https://mock-video.test/retry-playback.mp4";

  const msg: any = {
    id: 701,
    sender_role: "consumer",
    created_on: new Date().toISOString(),
    content: "",
    video: {
      id: fileId,
      url: videoUrl,
      original_name: "video.mp4",
      duration_seconds: 17,
      mime_type: "video/mp4",
    },
  };

  await this.stubGet("/conversations", [
    aConversation({
      id: 1,
      status: "accepted",
      counterpart: aCounterpart({ id: 1, role: "provider", name: "Juan", surname: "Gómez" }),
    }),
  ]);
  await this.stubGet(
    "/conversations/1",
    aConversationDetail({
      id: 1,
      status: "accepted",
      counterpart: aCounterpart({ id: 1, role: "provider", name: "Juan", surname: "Gómez" }),
      messages: [msg],
    })
  );
  await this.stubGet("/job-requests", []);
  await this.stubGet("/service-proposals", []);
  await this.stubPost("/ws-tickets", 201, aWsTicket());

  await this.page.unroute("**/mock-video.test/**").catch(() => {});
  await this.page.route("**/mock-video.test/**", async (route) => {
    await route.abort("failed");
  });

  await this.page.goto(
    APP_URL + ROUTES.consumer.messages + "?provider_id=1&name=Juan&surname=Gómez",
    { waitUntil: "networkidle" }
  );
  const playButton = this.page.getByTestId("video-play-button").first();
  await playButton.waitFor(visibleTimeout);
  await playButton.click();

  const errorNotice = this.page.getByTestId("video-playback-error");
  await errorNotice.waitFor(visibleTimeout);
});

Given(
  "que el video está {string} al volver a cargarlo",
  async function (this: CustomWorld, disponibilidad: string) {
    if (disponibilidad === "disponible nuevamente") {
      await this.page.unroute("**/mock-video.test/**").catch(() => {});
      await this.page.route("**/mock-video.test/**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "video/mp4",
          body: MOCK_VALID_MP4_BUFFER,
        });
      });
    } else {
      await this.page.unroute("**/mock-video.test/**");
      await this.page.route("**/mock-video.test/**", async (route) => {
        await route.abort("failed");
      });
    }
  }
);

When("reintento cargar el video", async function (this: CustomWorld) {
  const retryBtn = this.page.getByTestId("video-retry-button");
  await retryBtn.waitFor(visibleTimeout);
  await retryBtn.click();
});

Then("veo {string}", async function (this: CustomWorld, resultado: string) {
  if (resultado === "el video listo para reproducir") {
    const errorNotice = this.page.getByTestId("video-playback-error");
    await errorNotice.waitFor({ state: "detached", timeout: 5000 });
    assert.strictEqual(await errorNotice.count(), 0);

    const player = this.page.getByTestId("video-viewer-player");
    await player.waitFor(visibleTimeout);
    assert.ok(await player.isVisible());
  } else if (resultado === "un error con las opciones de volver a intentar o cerrar") {
    const errorNotice = this.page.getByTestId("video-playback-error");
    await errorNotice.waitFor(visibleTimeout);
    assert.ok(await errorNotice.isVisible());

    const retryBtn = this.page.getByTestId("video-retry-button");
    assert.ok(await retryBtn.isVisible());
    const closeBtn = this.page.getByTestId("video-close-button");
    assert.ok(await closeBtn.isVisible());
  }
});

Then("no se crea ningún mensaje nuevo", async function (this: CustomWorld) {
  const messageList = this.page.locator('[data-testid="messages-list"]');
  const players = messageList.getByTestId("video-message-player");
  assert.strictEqual(await players.count(), 1);
});

After(async function (this: VideoWorld) {
  await this.page?.unroute("**/mock-video.test/**").catch(() => {});
  await this.page?.setViewportSize({ width: 1280, height: 720 }).catch(() => {});
  if (this.tempVideoPath && fs.existsSync(this.tempVideoPath)) {
    try {
      fs.unlinkSync(this.tempVideoPath);
    } catch {
      // ignore
    }
  }
});
