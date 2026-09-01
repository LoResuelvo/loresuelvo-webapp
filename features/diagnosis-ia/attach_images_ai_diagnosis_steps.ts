import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, APP_URL, visibleTimeout, attachedTimeout, waitTimeout, attachedState } from "../support/world";
import { ROUTES } from "../../lib/routes";
import { aPresignedUpload, aConfirmedFile, aAiConversation, aAiConversationDetail, anAiMessage, aMessageImage, anApiError } from "../support/factories";

let currentDiagnosisImages: string[] = [];

async function stubDiagnosisFileUpload(world: CustomWorld, fileName: string, fileId: string = "mock-diag-file-123") {
  await world.stubPost(
    "/files/presign",
    200,
    aPresignedUpload({
      file_id: fileId,
      upload_url: "https://mock-upload.test/upload",
      key: `conversation_message_image/${fileId}`,
    })
  );

  await world.page.route("https://mock-upload.test/upload", async (route) => {
    await route.fulfill({ status: 204 });
  });

  await world.stubPost(
    `/files/${fileId}/confirm`,
    200,
    aConfirmedFile({
      id: fileId,
      original_name: fileName,
    })
  );
}

function buildAiConversationResponse(images: string[] = [], content: string = "") {
  return aAiConversationDetail({
    id: 1,
    title: "Pérdida de agua",
    response_status: "answered",
    messages: [
      anAiMessage({
        id: 1,
        sender_role: "consumer",
        content: "Se está filtrando agua debajo de la bacha",
        created_on: "2026-06-18T10:00:00Z",
      }),
      anAiMessage({
        id: 2,
        sender_role: "chatbot",
        content: "Revisá si el agua sale desde la rosca del sifón.",
        created_on: "2026-06-18T10:00:01Z",
      }),
      anAiMessage({
        id: 3,
        sender_role: "consumer",
        content,
        images: images.map((name, idx) => aMessageImage({ id: `mock-diag-file-${idx}`, url: `/${name}`, original_name: name })),
        created_on: new Date().toISOString(),
      }),
      anAiMessage({
        id: 4,
        sender_role: "chatbot",
        content: "Por la imagen, parece ser una fuga en la unión del sifón. Te recomiendo contactar un plomero.",
        created_on: new Date().toISOString(),
      }),
    ],
    recommended_providers: [],
  });
}

Given("tengo una conversación activa con el asistente de diagnóstico", async function (this: CustomWorld) {
  currentDiagnosisImages = [];
  await this.stubGet("/chatbot/conversations", [aAiConversation()]);
  await this.stubGet("/conversations/1", aAiConversationDetail());
});

Given("estoy en el chat con el asistente de diagnóstico", async function (this: CustomWorld) {
  await this.page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?id=1`);
  await this.page.waitForLoadState("networkidle");
});

Given("adjunté la imagen {string} para el diagnóstico", async function (this: CustomWorld, imagen: string) {
  currentDiagnosisImages.push(imagen);
  await stubDiagnosisFileUpload(this, imagen);

  const fileChooserPromise = this.page.waitForEvent("filechooser");
  await this.page.getByRole("button", { name: /adjuntar/i }).click();
  const fileChooser = await fileChooserPromise;

  const fileData = { name: imagen, mimeType: "image/jpeg", buffer: Buffer.from("mock-image-data") };
  await fileChooser.setFiles([fileData]);

  const thumbnail = this.page.getByRole("img", { name: `Vista previa de ${imagen}` });
  await thumbnail.waitFor(visibleTimeout).catch(() => {});
});

Given("adjunté las imágenes {string} y {string} para el diagnóstico", async function (this: CustomWorld, img1: string, img2: string) {
  currentDiagnosisImages.push(img1, img2);
  await stubDiagnosisFileUpload(this, img1, "mock-diag-file-0");
  await stubDiagnosisFileUpload(this, img2, "mock-diag-file-1");

  const fileChooserPromise = this.page.waitForEvent("filechooser");
  await this.page.getByRole("button", { name: /adjuntar/i }).click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles([
    { name: img1, mimeType: "image/jpeg", buffer: Buffer.from("mock1") },
    { name: img2, mimeType: "image/jpeg", buffer: Buffer.from("mock2") },
  ]);
});

When("adjunto una imagen {string} desde la galería", async function (this: CustomWorld, imagen: string) {
  currentDiagnosisImages.push(imagen);
  await stubDiagnosisFileUpload(this, imagen);

  const fileChooserPromise = this.page.waitForEvent("filechooser");
  await this.page.getByRole("button", { name: /adjuntar/i }).click();
  const fileChooser = await fileChooserPromise;

  const fileData = { name: imagen, mimeType: "image/jpeg", buffer: Buffer.from("mock-image-data") };
  await fileChooser.setFiles([fileData]);
});

When("elimino la imagen {string} del área de adjuntos", async function (this: CustomWorld, imagen: string) {
  currentDiagnosisImages = currentDiagnosisImages.filter((img) => img !== imagen);
  const deleteBtn = this.page.getByRole("button", { name: `Eliminar ${imagen}` });
  await deleteBtn.click();
});

When("reviso las imágenes adjuntas antes de enviar", async function (this: CustomWorld) {
  const attachmentArea = this.page.locator('[role="region"][aria-label*="adjunt"], [aria-label*="Vista previa"]').first();
  await attachmentArea.waitFor(visibleTimeout);
});

When("envío el mensaje de diagnóstico {string}", async function (this: CustomWorld, mensaje: string) {
  await this.stubPost(
    "/chatbot/conversations/1/messages",
    201,
    buildAiConversationResponse(currentDiagnosisImages, mensaje)
  );

  currentDiagnosisImages = [];

  const input = this.page.getByPlaceholder(/escribe un mensaje/i);
  await input.fill(mensaje);

  const sendButton = this.page.getByRole("button", { name: /enviar mensaje/i });
  await sendButton.click();
});

When("envío el mensaje de diagnóstico sin texto", async function (this: CustomWorld) {
  await this.stubPost(
    "/chatbot/conversations/1/messages",
    201,
    buildAiConversationResponse(currentDiagnosisImages, "")
  );

  currentDiagnosisImages = [];

  const sendButton = this.page.getByRole("button", { name: /enviar mensaje/i });
  await sendButton.click();
});

When("la carga de la imagen {string} falla por un error del servidor", async function (this: CustomWorld, imagen: string) {
  await this.stubPost("/files/presign", 500, anApiError("Internal Server Error"));

  const fileChooserPromise = this.page.waitForEvent("filechooser");
  await this.page.getByRole("button", { name: /adjuntar/i }).click();
  const fileChooser = await fileChooserPromise;

  const fileData = { name: imagen, mimeType: "image/jpeg", buffer: Buffer.from("mock-image-data") };
  await fileChooser.setFiles([fileData]);
});

When("envío el mensaje de diagnóstico {string} y el procesamiento falla", async function (this: CustomWorld, mensaje: string) {
  await this.stubPost("/chatbot/conversations/1/messages", 500, anApiError("Internal Server Error"));

  currentDiagnosisImages = [];

  const input = this.page.getByPlaceholder(/escribe un mensaje/i);
  await input.fill(mensaje);

  const sendButton = this.page.getByRole("button", { name: /enviar mensaje/i });
  await sendButton.click();
});

When("adjunto una imagen {string} que supera los 5MB en el diagnóstico", async function (this: CustomWorld, imagen: string) {
  const fileChooserPromise = this.page.waitForEvent("filechooser");
  await this.page.getByRole("button", { name: /adjuntar/i }).click();
  const fileChooser = await fileChooserPromise;

  const largeBuffer = Buffer.alloc(5.1 * 1024 * 1024);

  const fileData = { name: imagen, mimeType: "image/jpeg", buffer: largeBuffer };
  await fileChooser.setFiles([fileData]);
});

Then("veo la vista previa de la imagen {string} en el área de adjuntos", async function (this: CustomWorld, imagen: string) {
  const thumbnail = this.page.getByRole("img", { name: `Vista previa de ${imagen}` });
  await thumbnail.waitFor(visibleTimeout);
  assert.ok(await thumbnail.isVisible(), `La vista previa de ${imagen} no se muestra`);
});

Then("la imagen {string} ya no aparece en el área de adjuntos", async function (this: CustomWorld, imagen: string) {
  const thumbnail = this.page.getByRole("img", { name: `Vista previa de ${imagen}` });
  const count = await thumbnail.count();
  assert.strictEqual(count, 0, `La imagen ${imagen} sigue visible en el área de adjuntos`);
});

Then("el sistema muestra mi mensaje con la imagen {string} en el chat", async function (this: CustomWorld, imagen: string) {
  const sentImage = this.page.getByRole("img", { name: `Imagen adjunta ${imagen}` }).first();
  await sentImage.waitFor(visibleTimeout);
  assert.ok(await sentImage.isVisible(), `La imagen ${imagen} no se muestra en el chat`);
});

Then("el asistente recibe el mensaje con la imagen para procesar el diagnóstico", async function (this: CustomWorld) {
  const reply = this.page
    .getByText("Por la imagen, parece ser una fuga en la unión del sifón. Te recomiendo contactar un plomero.")
    .first();
  await reply.waitFor(visibleTimeout);
  assert.ok(await reply.isVisible(), "No se ve la respuesta del asistente tras enviar la imagen");
});

Then("veo un mensaje de error indicando que no se pudo cargar la imagen", async function (this: CustomWorld) {
  const errorMsg = this.page.getByText(/no se pudo cargar la imagen/i);
  await errorMsg.waitFor(visibleTimeout);
  assert.ok(await errorMsg.isVisible(), "No se muestra el error de carga de imagen");
});

Then("puedo reintentar la carga", async function (this: CustomWorld) {
  const retryBtn = this.page.getByRole("button", { name: /reintentar/i });
  await retryBtn.waitFor(visibleTimeout);
  assert.ok(await retryBtn.isVisible(), "No se ve el botón para reintentar la carga");

  await stubDiagnosisFileUpload(this, "foto-corrupta.jpg", "retry-diag-file-123");
  await retryBtn.click();
  await this.page.getByText(/no se pudo cargar la imagen/i).waitFor({ state: "hidden", timeout: 5000 });
  await this.page.getByLabel("Error al cargar imagen").waitFor({ state: "hidden", timeout: 5000 });
  await this.page.getByLabel("Cargando imagen").waitFor({ state: "hidden", timeout: 5000 });
  const thumbnail = this.page.getByRole("img", { name: /^vista previa de/i }).first();
  await thumbnail.waitFor(visibleTimeout);
  assert.ok(await thumbnail.isVisible(), "La imagen no quedó visible en el área de adjuntos tras el reintento");
});

Then("veo un mensaje de error indicando que la imagen es demasiado grande", async function (this: CustomWorld) {
  const errorMsg = this.page.getByText(/no debe superar los 5MB/i);
  await errorMsg.waitFor(visibleTimeout);
  assert.ok(await errorMsg.isVisible(), "No se muestra el error de tamaño de imagen");
});

Then("la imagen no se adjunta al área de adjuntos", async function (this: CustomWorld) {
  const thumbnail = this.page.locator('img[alt^="Vista previa"]');
  const count = await thumbnail.count();
  assert.strictEqual(count, 0, "Se adjuntó una imagen cuando no debería");
});

function buildHomeAiConversationResponse(
  images: string[] = [],
  content: string = "Se está filtrando agua debajo de la bacha"
) {
  return aAiConversationDetail({
    id: 1,
    title: "Pérdida de agua",
    response_status: "answered",
    messages: [
      anAiMessage({
        id: 1,
        sender_role: "consumer",
        content,
        images: images.map((name, idx) => aMessageImage({ id: `mock-diag-file-${idx}`, url: `/${name}`, original_name: name })),
        created_on: "2026-06-18T10:00:00Z",
      }),
      anAiMessage({
        id: 2,
        sender_role: "chatbot",
        content: "Entiendo. ¿La pérdida ocurre de forma constante o solamente cuando utilizas la canilla?",
        created_on: "2026-06-18T10:00:01Z",
      }),
    ],
    recommended_providers: [],
  });
}

Given("adjunté la imagen {string} en el campo de diagnóstico", async function (this: CustomWorld, imagen: string) {
  currentDiagnosisImages.push(imagen);
  await stubDiagnosisFileUpload(this, imagen);

  await this.stubPost("/chatbot/conversations", 200, buildHomeAiConversationResponse(currentDiagnosisImages));
  await this.stubGet("/conversations/1", buildHomeAiConversationResponse(currentDiagnosisImages));

  const fileChooserPromise = this.page.waitForEvent("filechooser");
  await this.page.getByRole("button", { name: /adjuntar/i }).click();
  const fileChooser = await fileChooserPromise;

  const fileData = { name: imagen, mimeType: "image/jpeg", buffer: Buffer.from("mock-image-data") };
  await fileChooser.setFiles([fileData]);

  const thumbnail = this.page.getByRole("img", { name: `Vista previa de ${imagen}` });
  await thumbnail.waitFor(visibleTimeout).catch(() => {});
});

When(
  "adjunto una imagen {string} en el campo de diagnóstico desde la galería",
  async function (this: CustomWorld, imagen: string) {
    currentDiagnosisImages.push(imagen);
    await stubDiagnosisFileUpload(this, imagen);

    await this.stubPost("/chatbot/conversations", 200, buildHomeAiConversationResponse(currentDiagnosisImages));
    await this.stubGet("/conversations/1", buildHomeAiConversationResponse(currentDiagnosisImages));

    const fileChooserPromise = this.page.waitForEvent("filechooser");
    await this.page.getByRole("button", { name: /adjuntar/i }).click();
    const fileChooser = await fileChooserPromise;

    const fileData = { name: imagen, mimeType: "image/jpeg", buffer: Buffer.from("mock-image-data") };
  await fileChooser.setFiles([fileData]);
  }
);
