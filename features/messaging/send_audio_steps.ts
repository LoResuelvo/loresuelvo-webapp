import { Given, Then, When } from "@cucumber/cucumber";
import assert from "assert";
import { APP_URL, CustomWorld, visibleTimeout } from "../support/world";
import {
  aConversation,
  aConversationDetail,
  aConversationMessage,
  aCounterpart,
  aConfirmedFile,
  aPresignedUpload,
  aWsTicket,
} from "../support/factories";
import { ROUTES } from "../../lib/routes";

async function stubAudioChat(world: CustomWorld) {
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

async function installMediaRecorderMock(world: CustomWorld) {
  await world.page.addInitScript(() => {
    let activeRecorder: TestMediaRecorder | null = null;

    class TestMediaRecorder {
      static isTypeSupported(mimeType: string) {
        return mimeType === "audio/webm;codecs=opus" || mimeType === "audio/webm";
      }

      state: RecordingState = "inactive";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor(_stream: MediaStream, _options?: MediaRecorderOptions) {}

      start() {
        this.state = "recording";
        activeRecorder = this;
      }

      stop() {
        if (this.state === "inactive") return;
        this.state = "inactive";
        this.ondataavailable?.({
          data: new Blob(["deterministic-audio"], { type: "audio/webm;codecs=opus" }),
        });
        this.onstop?.();
      }
    }

    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: TestMediaRecorder,
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop: () => undefined }],
        }),
      },
    });
    Object.defineProperty(window, "__e2eStopRecording", {
      configurable: true,
      value: () => activeRecorder?.stop(),
    });
  });
}

Given("que estoy en un chat activo como consumidor", async function (this: CustomWorld) {
  await stubAudioChat(this);
  await installMediaRecorderMock(this);
  await this.page.goto(
    APP_URL + ROUTES.consumer.messages + "?provider_id=1&name=Juan&surname=Gómez",
    { waitUntil: "domcontentloaded" }
  );
  await this.page.locator('[data-testid="messages-list"]').waitFor(visibleTimeout);
});

Given("que estoy autenticado como consumidor", async function (this: CustomWorld) {
  await stubAudioChat(this);
  await this.page.goto(
    APP_URL + ROUTES.consumer.messages + "?provider_id=1&name=Juan&surname=Gómez",
    { waitUntil: "domcontentloaded" }
  );
  await this.page.locator('[data-testid="messages-list"]').waitFor(visibleTimeout);
  await this.stubPost(
    "/files/presign",
    200,
    aPresignedUpload({
      file_id: "audio-file-001",
      key: "conversation_message_audio/audio-file-001",
      upload_url: "https://mock-upload.test/audio",
    })
  );
  await this.page.route("https://mock-upload.test/audio", async (route) => {
    await route.fulfill({ status: 204 });
  });
  await this.stubPost(
    "/files/audio-file-001/confirm",
    200,
    aConfirmedFile({
      id: "audio-file-001",
      url: "https://mock-audio.test/ruido-bomba.webm",
      original_name: "ruido-bomba.webm",
    })
  );
  await this.stubPost(
    "/conversations/1/messages",
    201,
    {
      id: 99,
      sender_role: "consumer",
      created_on: new Date().toISOString(),
      audio: {
        id: "audio-file-001",
        url: "https://mock-audio.test/ruido-bomba.webm",
        original_name: "ruido-bomba.webm",
        duration_seconds: 18,
        mime_type: "audio/webm",
      },
    }
  );
});

Given("que estoy autenticado como prestador", async function (this: CustomWorld) {
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
      messages: [
        aConversationMessage({
          id: 1,
          sender_role: "consumer",
          content: "Hola Juan",
        }),
      ],
    })
  );
  await this.stubGet("/job-requests", []);
  await this.stubGet("/service-proposals", []);
  await this.stubPost("/ws-tickets", 201, aWsTicket());

  await this.page.goto(
    APP_URL + ROUTES.provider.messages + "?consumer_id=1",
    { waitUntil: "domcontentloaded" }
  );
  await this.page.locator('[data-testid="messages-list"]').waitFor(visibleTimeout);
  await this.stubPost(
    "/files/presign",
    200,
    aPresignedUpload({
      file_id: "audio-file-provider-001",
      key: "conversation_message_audio/audio-file-provider-001",
      upload_url: "https://mock-upload.test/provider-audio",
    })
  );
  await this.page.route("https://mock-upload.test/provider-audio", async (route) => {
    await route.fulfill({ status: 204 });
  });
  await this.stubPost(
    "/files/audio-file-provider-001/confirm",
    200,
    aConfirmedFile({
      id: "audio-file-provider-001",
      url: "https://mock-audio.test/indicaciones-visita.webm",
      original_name: "indicaciones-visita.webm",
    })
  );
  await this.stubPost(
    "/conversations/1/messages",
    201,
    {
      id: 100,
      sender_role: "provider",
      created_on: new Date().toISOString(),
      audio: {
        id: "audio-file-provider-001",
        url: "https://mock-audio.test/indicaciones-visita.webm",
        original_name: "indicaciones-visita.webm",
        duration_seconds: 18,
        mime_type: "audio/webm",
      },
    }
  );
});

Given("que tengo confirmado el audio {string}", async function (this: CustomWorld, fileName: string) {
  await this.page.getByRole("button", { name: "Abrir menú de acciones" }).click();
  await this.page.getByRole("menuitem", { name: "Adjuntar audio" }).click();
  await this.page.locator('input[accept="audio/webm"]').setInputFiles({
    name: fileName,
    mimeType: "audio/webm",
    buffer: Buffer.from("deterministic-confirmed-audio"),
  });
  await this.page.getByTestId("audio-preview").waitFor(visibleTimeout);
});

Given("que el navegador permite usar el micrófono", async function (this: CustomWorld) {
  const supported = await this.page.evaluate(() =>
    Boolean(
      typeof navigator.mediaDevices?.getUserMedia === "function" &&
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    )
  );
  assert.ok(supported, "El mock E2E no habilitó la grabación WebM/Opus");
});

Given("que el navegador rechazó el permiso para usar el micrófono", async function (this: CustomWorld) {
  await this.page.evaluate(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new DOMException("Permission denied", "NotAllowedError");
        },
      },
    });
  });
});

Given("que abrí el menú de adjuntos", async function (this: CustomWorld) {
  await this.page.getByRole("button", { name: "Abrir menú de acciones" }).click();
  await this.page.getByRole("menu").waitFor(visibleTimeout);
});

Given("que tengo un audio WebM con codec Opus de {int} segundos", async function (this: CustomWorld, duration: number) {
  (this as CustomWorld & { audioDurationSeconds?: number }).audioDurationSeconds = duration;
  await this.page.getByRole("button", { name: "Abrir menú de acciones" }).click();
  await this.page.getByRole("menuitem", { name: "Adjuntar audio" }).click();
  await this.page.locator('input[accept="audio/webm"]').setInputFiles({
    name: `audio-${duration}s.webm`,
    mimeType: "audio/webm",
    buffer: Buffer.from("deterministic-audio-with-metadata"),
  });
  await this.page.getByTestId("audio-preview").waitFor(visibleTimeout);
});

When("grabo un audio WebM con codec Opus de 5 segundos", async function (this: CustomWorld) {
  await this.page.getByRole("button", { name: "Abrir menú de acciones" }).click();
  await this.page.getByRole("menuitem", { name: "Grabar audio" }).click();
  await this.page.getByTestId("audio-recording").waitFor(visibleTimeout);
  await this.page.evaluate(() => {
    (window as Window & { __e2eStopRecording?: () => void }).__e2eStopRecording?.();
  });
});

When("intento grabar un audio", async function (this: CustomWorld) {
  await this.page.getByRole("button", { name: "Abrir menú de acciones" }).click();
  await this.page.getByRole("menuitem", { name: "Grabar audio" }).click();
});

When(
  'intento adjuntar {string} con MIME {string} y codec {string}',
  async function (this: CustomWorld, fileName: string, mimeType: string, _codec: string) {
    const audioInput = this.page.locator('input[accept="audio/webm"]');
    await audioInput.setInputFiles({
      name: fileName,
      mimeType,
      buffer: Buffer.from("deterministic-invalid-audio"),
    });
  }
);

When("intento adjuntar un audio WebM con codec Opus de {int} MiB", async function (this: CustomWorld, sizeInMiB: number) {
  const audioInput = this.page.locator('input[accept="audio/webm"]');
  await audioInput.setInputFiles({
    name: "audio-grande.webm",
    mimeType: "audio/webm",
    buffer: Buffer.alloc(sizeInMiB * 1024 * 1024, 1),
  });
});

When("envío únicamente el audio {string}", async function (this: CustomWorld, _fileName: string) {
  await this.page.getByRole("button", { name: /Enviar mensaje/i }).click();
  await this.page.getByTestId("audio-preview").waitFor({ state: "detached", timeout: 5000 });
});

When("confirmo el audio para enviarlo", async function (this: CustomWorld) {
  const duration = (this as CustomWorld & { audioDurationSeconds?: number }).audioDurationSeconds;
  assert.ok(duration !== undefined, "Falta la duración de metadata del audio");
  const player = this.page.getByTestId("audio-preview").locator("audio");
  await player.waitFor(visibleTimeout);
  await player.evaluate((element, seconds) => {
    Object.defineProperty(element, "duration", { configurable: true, value: seconds });
    element.dispatchEvent(new Event("loadedmetadata", { bubbles: true }));
  }, duration);
});

Then("veo la preview del audio grabado", async function (this: CustomWorld) {
  await this.page.getByTestId("audio-preview").waitFor(visibleTimeout);
  assert.ok(await this.page.getByTestId("audio-preview").isVisible());
});

Then("puedo reproducirlo antes de enviarlo", async function (this: CustomWorld) {
  const player = this.page.getByLabel(/Reproductor de audio/i);
  await player.waitFor(visibleTimeout);
  assert.strictEqual(await player.getAttribute("controls"), "");
});

Then("veo un mensaje indicando que no se puede acceder al micrófono", async function (this: CustomWorld) {
  const error = this.page.getByText("No se puede acceder al micrófono", { exact: false });
  await error.waitFor(visibleTimeout);
  assert.ok(await error.isVisible());
});

Then("no se crea ninguna preview de audio", async function (this: CustomWorld) {
  assert.strictEqual(await this.page.getByTestId("audio-preview").count(), 0);
});

Then("veo un error de formato no permitido", async function (this: CustomWorld) {
  const error = this.page.getByText("Formato de audio no permitido", { exact: false });
  await error.waitFor(visibleTimeout);
  assert.ok(await error.isVisible());
});

Then("veo un error indicando que supera los 5 MiB", async function (this: CustomWorld) {
  const error = this.page.getByText("El audio no debe superar los 5 MiB", { exact: false });
  await error.waitFor(visibleTimeout);
  assert.ok(await error.isVisible());
});

Then("la validación de duración informa {string}", async function (this: CustomWorld, result: string) {
  if (result === "rechazado") {
    const error = this.page.getByText("El audio no puede superar los 300 segundos", { exact: false });
    await error.waitFor(visibleTimeout);
    assert.ok(await error.isVisible());
    return;
  }

  if (result === "aceptado") {
    const accepted = this.page.getByText("Duración de audio aceptada", { exact: false });
    await accepted.waitFor(visibleTimeout);
    assert.ok(await accepted.isVisible());
    return;
  }

  throw new Error(`Resultado de duración desconocido: ${result}`);
});

Then("el audio no se agrega al composer", async function (this: CustomWorld) {
  assert.strictEqual(await this.page.getByTestId("audio-preview").count(), 0);
});

Then("veo la burbuja del audio en la conversación", async function (this: CustomWorld) {
  const player = this.page.getByLabel(/Reproductor de audio/i).last();
  await player.waitFor(visibleTimeout);
  assert.ok(await player.isVisible());
});

Then("la burbuja muestra su duración", async function (this: CustomWorld) {
  const duration = this.page.getByTestId("audio-duration");
  await duration.waitFor(visibleTimeout);
  assert.ok((await duration.textContent())?.includes("0:18"));
});
