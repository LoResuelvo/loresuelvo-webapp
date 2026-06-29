import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { page } from "./landing_page_visualization_steps";
import { setConsumerSession } from "./initiate_chat_with_provider_steps";
import { addApiStub } from "./stubs-helper";
import { ROUTES } from "../../lib/routes";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

let currentDiagnosisImages: string[] = [];

async function stubDiagnosisFileUpload(fileName: string, fileId: string = "mock-diag-file-123") {
  await addApiStub({
    method: "POST",
    endpoint: "/files/presign",
    status: 200,
    body: {
      file_id: fileId,
      upload_url: "https://mock-upload.test/upload",
      headers: {},
      key: `conversation_message_image/${fileId}`
    }
  });

  await page.route("https://mock-upload.test/upload", async (route) => {
    await route.fulfill({ status: 204 });
  });

  await addApiStub({
    method: "POST",
    endpoint: `/files/${fileId}/confirm`,
    status: 200,
    body: {
      id: fileId,
      original_name: fileName
    }
  });
}

function buildAiConversationResponse(
  images: string[] = [],
  content: string = ""
) {
  return {
    id: 1,
    conversation_id: 1,
    status: "active",
    title: "Pérdida de agua",
    response_status: "answered",
    messages: [
      {
        id: 1,
        sender_role: "consumer",
        content: "Se está filtrando agua debajo de la bacha",
        created_on: "2026-06-18T10:00:00Z",
      },
      {
        id: 2,
        sender_role: "chatbot",
        content: "Revisá si el agua sale desde la rosca del sifón.",
        created_on: "2026-06-18T10:00:01Z",
      },
      {
        id: 3,
        sender_role: "consumer",
        content,
        images: images.map((name, idx) => ({
          id: `mock-diag-file-${idx}`,
          url: `/${name}`,
          original_name: name,
        })),
        created_on: new Date().toISOString(),
      },
      {
        id: 4,
        sender_role: "chatbot",
        content: "Por la imagen, parece ser una fuga en la unión del sifón. Te recomiendo contactar un plomero.",
        created_on: new Date().toISOString(),
      },
    ],
    response: {
      id: 4,
      sender_role: "chatbot",
      content: "Por la imagen, parece ser una fuga en la unión del sifón. Te recomiendo contactar un plomero.",
      created_on: new Date().toISOString(),
    },
    recommended_providers: [],
  };
}


Given("tengo una conversación activa con el asistente de diagnóstico", async () => {
  currentDiagnosisImages = [];

  await addApiStub({
    method: "GET",
    endpoint: "/chatbot/conversations",
    status: 200,
    body: [
      {
        id: 1,
        status: "active",
        title: "Pérdida de agua",
        last_message: {
          id: 2,
          sender_role: "chatbot",
          content: "Revisá si el agua sale desde la rosca del sifón.",
          created_on: "2026-06-18T10:00:01Z",
        },
        updated_on: "2026-06-18T10:00:01Z",
      },
    ],
  });

  await addApiStub({
    method: "GET",
    endpoint: "/conversations/1",
    status: 200,
    body: {
      id: 1,
      conversation_id: 1,
      status: "active",
      title: "Pérdida de agua",
      response_status: "answered",
      messages: [
        {
          id: 1,
          sender_role: "consumer",
          content: "Se está filtrando agua debajo de la bacha",
          created_on: "2026-06-18T10:00:00Z",
        },
        {
          id: 2,
          sender_role: "chatbot",
          content: "Revisá si el agua sale desde la rosca del sifón.",
          created_on: "2026-06-18T10:00:01Z",
        },
      ],
      recommended_providers: [],
    },
  });
});


Given("estoy en el chat con el asistente de diagnóstico", async () => {
  await page.goto(`${APP_URL}${ROUTES.consumer.aiMessages}?id=1`);
  await page.waitForLoadState("networkidle");
});

Given("adjunté la imagen {string} para el diagnóstico", async (imagen: string) => {
  currentDiagnosisImages.push(imagen);
  await stubDiagnosisFileUpload(imagen);

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /adjuntar/i }).click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles([{
    name: imagen,
    mimeType: "image/jpeg",
    buffer: Buffer.from("mock-image-data"),
  }]);

  const thumbnail = page.getByRole("img", { name: `Vista previa de ${imagen}` });
  await thumbnail.waitFor({ state: "visible", timeout: 2000 }).catch(() => {});
});

Given("adjunté las imágenes {string} y {string} para el diagnóstico", async (img1: string, img2: string) => {
  currentDiagnosisImages.push(img1, img2);
  await stubDiagnosisFileUpload(img1, "mock-diag-file-0");
  await stubDiagnosisFileUpload(img2, "mock-diag-file-1");

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /adjuntar/i }).click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles([
    { name: img1, mimeType: "image/jpeg", buffer: Buffer.from("mock1") },
    { name: img2, mimeType: "image/jpeg", buffer: Buffer.from("mock2") },
  ]);
});


When("adjunto una imagen {string} desde la galería", async (imagen: string) => {
  currentDiagnosisImages.push(imagen);
  await stubDiagnosisFileUpload(imagen);

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /adjuntar/i }).click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles([{
    name: imagen,
    mimeType: "image/jpeg",
    buffer: Buffer.from("mock-image-data"),
  }]);
});

When("elimino la imagen {string} del área de adjuntos", async (imagen: string) => {
  currentDiagnosisImages = currentDiagnosisImages.filter(img => img !== imagen);
  const deleteBtn = page.getByRole("button", { name: `Eliminar ${imagen}` });
  await deleteBtn.click();
});

When("reviso las imágenes adjuntas antes de enviar", async () => {
  const attachmentArea = page.locator('[role="region"][aria-label*="adjunt"], [aria-label*="Vista previa"]').first();
  await attachmentArea.waitFor({ state: "visible", timeout: 2000 });
});

When("envío el mensaje de diagnóstico {string}", async (mensaje: string) => {
  await addApiStub({
    method: "POST",
    endpoint: "/chatbot/conversations/1/messages",
    status: 201,
    body: buildAiConversationResponse(currentDiagnosisImages, mensaje),
  });

  currentDiagnosisImages = [];

  const input = page.getByPlaceholder(/escribe un mensaje/i);
  await input.fill(mensaje);

  const sendButton = page.getByRole("button", { name: /enviar mensaje/i });
  await sendButton.click();
});

When("envío el mensaje de diagnóstico sin texto", async () => {
  await addApiStub({
    method: "POST",
    endpoint: "/chatbot/conversations/1/messages",
    status: 201,
    body: buildAiConversationResponse(currentDiagnosisImages, ""),
  });

  currentDiagnosisImages = [];

  const sendButton = page.getByRole("button", { name: /enviar mensaje/i });
  await sendButton.click();
});

When("la carga de la imagen {string} falla por un error del servidor", async (imagen: string) => {
  await addApiStub({
    method: "POST",
    endpoint: "/files/presign",
    status: 500,
    body: { error: "Internal Server Error" },
  });

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /adjuntar/i }).click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles([{
    name: imagen,
    mimeType: "image/jpeg",
    buffer: Buffer.from("mock-image-data"),
  }]);
});

When("envío el mensaje de diagnóstico {string} y el procesamiento falla", async (mensaje: string) => {
  await page.route("**/chatbot/conversations/1/messages", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Internal Server Error" }),
    });
  });

  currentDiagnosisImages = [];

  const input = page.getByPlaceholder(/escribe un mensaje/i);
  await input.fill(mensaje);

  const sendButton = page.getByRole("button", { name: /enviar mensaje/i });
  await sendButton.click();
});

When("adjunto una imagen {string} que supera los 5MB en el diagnóstico", async (imagen: string) => {
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /adjuntar/i }).click();
  const fileChooser = await fileChooserPromise;

  const largeBuffer = Buffer.alloc(5.1 * 1024 * 1024);

  await fileChooser.setFiles([{
    name: imagen,
    mimeType: "image/jpeg",
    buffer: largeBuffer,
  }]);
});


Then("veo la vista previa de la imagen {string} en el área de adjuntos", async (imagen: string) => {
  const thumbnail = page.getByRole("img", { name: `Vista previa de ${imagen}` });
  await thumbnail.waitFor({ state: "visible", timeout: 2000 });
  assert.ok(await thumbnail.isVisible(), `La vista previa de ${imagen} no se muestra`);
});

Then("la imagen {string} ya no aparece en el área de adjuntos", async (imagen: string) => {
  const thumbnail = page.getByRole("img", { name: `Vista previa de ${imagen}` });
  const count = await thumbnail.count();
  assert.strictEqual(count, 0, `La imagen ${imagen} sigue visible en el área de adjuntos`);
});

Then("el sistema muestra mi mensaje con la imagen {string} en el chat", async (imagen: string) => {
  const sentImage = page.getByRole("img", { name: `Imagen adjunta ${imagen}` }).first();
  await sentImage.waitFor({ state: "visible", timeout: 3000 });
  assert.ok(await sentImage.isVisible(), `La imagen ${imagen} no se muestra en el chat`);
});

Then("el asistente recibe el mensaje con la imagen para procesar el diagnóstico", async () => {
  const reply = page.getByText(
    "Por la imagen, parece ser una fuga en la unión del sifón. Te recomiendo contactar un plomero."
  ).first();
  await reply.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await reply.isVisible(), "No se ve la respuesta del asistente tras enviar la imagen");
});

Then("veo un mensaje de error indicando que no se pudo cargar la imagen", async () => {
  const errorMsg = page.getByText(/no se pudo cargar la imagen/i);
  await errorMsg.waitFor({ state: "visible", timeout: 2000 });
  assert.ok(await errorMsg.isVisible(), "No se muestra el error de carga de imagen");
});

Then("puedo reintentar la carga", async () => {
  const retryBtn = page.getByRole("button", { name: /reintentar/i });
  await retryBtn.waitFor({ state: "visible", timeout: 2000 });
  assert.ok(await retryBtn.isVisible(), "No se ve el botón para reintentar la carga");
});

Then("veo un mensaje de error indicando que la imagen es demasiado grande", async () => {
  const errorMsg = page.getByText(/no debe superar los 5MB/i);
  await errorMsg.waitFor({ state: "visible", timeout: 2000 });
  assert.ok(await errorMsg.isVisible(), "No se muestra el error de tamaño de imagen");
});

Then("la imagen no se adjunta al área de adjuntos", async () => {
  const thumbnail = page.locator('img[alt^="Vista previa"]');
  const count = await thumbnail.count();
  assert.strictEqual(count, 0, "Se adjuntó una imagen cuando no debería");
});

function buildHomeAiConversationResponse(
  images: string[] = [],
  content: string = "Se está filtrando agua debajo de la bacha"
) {
  return {
    id: 1,
    conversation_id: 1,
    status: "active",
    title: "Pérdida de agua",
    response_status: "answered",
    messages: [
      {
        id: 1,
        sender_role: "consumer",
        content,
        images: images.map((name, idx) => ({
          id: `mock-diag-file-${idx}`,
          url: `/${name}`,
          original_name: name,
        })),
        created_on: "2026-06-18T10:00:00Z",
      },
      {
        id: 2,
        sender_role: "chatbot",
        content: "Entiendo. ¿La pérdida ocurre de forma constante o solamente cuando utilizas la canilla?",
        created_on: "2026-06-18T10:00:01Z",
      },
    ],
    response: {
      id: 2,
      sender_role: "chatbot",
      content: "Entiendo. ¿La pérdida ocurre de forma constante o solamente cuando utilizas la canilla?",
      created_on: "2026-06-18T10:00:01Z",
    },
    recommended_providers: [],
  };
}

Given("adjunté la imagen {string} en el campo de diagnóstico", async (imagen: string) => {
  currentDiagnosisImages.push(imagen);
  await stubDiagnosisFileUpload(imagen);

  await addApiStub({
    method: "POST",
    endpoint: "/chatbot/conversations",
    status: 200,
    body: buildHomeAiConversationResponse(currentDiagnosisImages),
  });

  await addApiStub({
    method: "GET",
    endpoint: "/conversations/1",
    status: 200,
    body: buildHomeAiConversationResponse(currentDiagnosisImages),
  });

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /adjuntar/i }).click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles([{
    name: imagen,
    mimeType: "image/jpeg",
    buffer: Buffer.from("mock-image-data"),
  }]);

  const thumbnail = page.getByRole("img", { name: `Vista previa de ${imagen}` });
  await thumbnail.waitFor({ state: "visible", timeout: 2000 }).catch(() => {});
});

When("adjunto una imagen {string} en el campo de diagnóstico desde la galería", async (imagen: string) => {
  currentDiagnosisImages.push(imagen);
  await stubDiagnosisFileUpload(imagen);

  await addApiStub({
    method: "POST",
    endpoint: "/chatbot/conversations",
    status: 200,
    body: buildHomeAiConversationResponse(currentDiagnosisImages),
  });

  await addApiStub({
    method: "GET",
    endpoint: "/conversations/1",
    status: 200,
    body: buildHomeAiConversationResponse(currentDiagnosisImages),
  });

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /adjuntar/i }).click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles([{
    name: imagen,
    mimeType: "image/jpeg",
    buffer: Buffer.from("mock-image-data"),
  }]);
});


