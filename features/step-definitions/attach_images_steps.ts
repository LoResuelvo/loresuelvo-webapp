import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { page } from "./landing_page_visualization_steps";
import { addApiStub } from "./stubs-helper";

let currentAttachedImages: string[] = [];

async function stubFileUpload(fileName: string, fileId: string = "mock-file-123") {
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

async function triggerFileChooser() {
  const fileChooserPromise = page.waitForEvent('filechooser');
  
  const menuBtn = page.getByLabel("Abrir menú de acciones");
  await menuBtn.waitFor({ state: "visible" });
  await menuBtn.click();
  
  const option = page.getByRole("menuitem", { name: "Adjuntar imágenes" });
  await option.waitFor({ state: "visible" });
  await option.click();
  
  return await fileChooserPromise;
}

Given("que adjunté la imagen {string}", async function (imagen: string) {
  currentAttachedImages.push(imagen);
  await stubFileUpload(imagen);
  
  const fileChooser = await triggerFileChooser();
  
  await fileChooser.setFiles([{
    name: imagen,
    mimeType: 'image/jpeg',
    buffer: Buffer.from('mock-image-data')
  }]);
  
  const thumbnail = page.getByRole('img', { name: `Vista previa de ${imagen}` });
  await thumbnail.waitFor({ state: "visible", timeout: 2000 }).catch(() => {});
});

Given("que adjunté las imágenes {string} y {string}", async function (img1: string, img2: string) {
  currentAttachedImages.push(img1, img2);
  await stubFileUpload(img1, "mock-file-1");
  await stubFileUpload(img2, "mock-file-2");
  
  const fileChooser = await triggerFileChooser();
  
  await fileChooser.setFiles([
    { name: img1, mimeType: 'image/jpeg', buffer: Buffer.from('mock1') },
    { name: img2, mimeType: 'image/jpeg', buffer: Buffer.from('mock2') }
  ]);
});

When("adjunto la imagen {string} que supera los 5MB", async function (imagen: string) {
  const fileChooser = await triggerFileChooser();
  
  // Create a large buffer (5.1MB)
  const largeBuffer = Buffer.alloc(5.1 * 1024 * 1024);
  
  await fileChooser.setFiles([{
    name: imagen,
    mimeType: 'image/jpeg',
    buffer: largeBuffer
  }]);
});

Given("que eliminé la imagen {string} de los archivos adjuntos", async function (imagen: string) {
  currentAttachedImages = currentAttachedImages.filter(img => img !== imagen);
  const deleteBtn = page.getByRole('button', { name: `Eliminar ${imagen}` });
  await deleteBtn.click();
});

When("envío el mensaje {string}", async function (mensaje: string) {
  await addApiStub({
    method: "POST",
    endpoint: "/conversations/1/messages",
    status: 201,
    body: {
      id: 999,
      conversation_id: 1,
      sender_role: "consumer",
      content: mensaje,
      images: currentAttachedImages.map((name, idx) => ({ id: `mock-file-${idx}`, url: `/${name}`, original_name: name })),
      created_on: new Date().toISOString()
    }
  });

  currentAttachedImages = []; // reset after sending

  const input = page.getByRole('textbox', { name: /escribe un mensaje/i });
  await input.fill(mensaje);
  
  const sendButton = page.getByRole('button', { name: /enviar/i });
  await sendButton.click();
});

When("envío el mensaje sin texto", async function () {
  await addApiStub({
    method: "POST",
    endpoint: "/conversations/1/messages",
    status: 201,
    body: {
      id: 999,
      conversation_id: 1,
      sender_role: "consumer",
      content: "",
      images: currentAttachedImages.map((name, idx) => ({ id: `mock-file-${idx}`, url: `/${name}`, original_name: name })),
      created_on: new Date().toISOString()
    }
  });

  currentAttachedImages = []; // reset after sending

  const sendButton = page.getByRole('button', { name: /enviar/i });
  await sendButton.click();
});

Then("el sistema registra y muestra el mensaje con la imagen {string}", async function (imagen: string) {
  const sentImage = page.getByRole('img', { name: `Imagen adjunta ${imagen}` }).first();
  await sentImage.waitFor({ state: "visible", timeout: 2000 });
  assert.ok(await sentImage.isVisible(), `La imagen ${imagen} no se muestra en el chat`);
});

Then("el sistema registra y muestra el mensaje con las imágenes {string} y {string}", async function (img1: string, img2: string) {
  const sentImage1 = page.getByRole('img', { name: `Imagen adjunta ${img1}` }).first();
  const sentImage2 = page.getByRole('img', { name: `Imagen adjunta ${img2}` }).first();
  
  await sentImage1.waitFor({ state: "visible", timeout: 2000 });
  await sentImage2.waitFor({ state: "visible", timeout: 2000 });
  
  assert.ok(await sentImage1.isVisible(), `La imagen ${img1} no se muestra en el chat`);
  assert.ok(await sentImage2.isVisible(), `La imagen ${img2} no se muestra en el chat`);
});

Given("que el consumidor envió un mensaje con la imagen {string}", async function (imagen: string) {
  await addApiStub({
    method: "GET",
    endpoint: `/conversations/1`,
    status: 200,
    body: {
      id: 1,
      status: "accepted",
      counterpart: { id: "consumer-001", role: "consumer", name: "Ana", surname: "Pérez", category_name: "Plomería" },
      messages: [
        {
          id: 1,
          sender_role: "consumer",
          content: "Hola",
          images: [{ id: "file-xyz", url: "/img.jpg", original_name: imagen }],
          created_on: new Date().toISOString(),
        },
      ],
      updated_on: new Date().toISOString(),
    },
  });
  await page.reload({ waitUntil: "networkidle" });
});

Then("el detalle del mensaje en pantalla incluye la imagen {string}", async function (imagen: string) {
  const receivedImage = page.locator(`img[alt*="${imagen}"]`).first();
  await receivedImage.waitFor({ state: "visible", timeout: 2000 });
  assert.ok(await receivedImage.isVisible(), `El detalle no incluye la imagen ${imagen}`);
});

When("el consumidor {string} me envía un mensaje con la imagen {string}", async function (nombre: string, imagen: string) {
  const wsServer = (global as any).wsServer;
  if (wsServer) {
    wsServer.send(JSON.stringify({
      type: "conversation.message.created",
      conversation_id: 1,
      message: {
        id: 200,
        content: "Mensaje WS",
        sender_role: "consumer",
        images: [{ id: 999, url: "/img.jpg", original_name: imagen }],
        created_on: new Date().toISOString(),
      },
    }));
  }
});

Then("veo el mensaje con la imagen {string} en la pantalla del chat sin recargar la página", async function (imagen: string) {
  const receivedImage = page.locator(`img[alt*="${imagen}"]`).first();
  await receivedImage.waitFor({ state: "visible", timeout: 3000 });
  assert.ok(await receivedImage.isVisible(), `La imagen WS ${imagen} no se mostró en realtime`);
});

Then("veo un mensaje de error indicando que la imagen es muy grande", async function () {
  const errorMsg = page.getByText(/no debe superar los 5MB/i);
  await errorMsg.waitFor({ state: "visible", timeout: 2000 });
  assert.ok(await errorMsg.isVisible(), "No se muestra el error de tamaño");
});

Then("la imagen no se adjunta al mensaje", async function () {
  const thumbnail = page.locator('img[alt^="Vista previa"]');
  const count = await thumbnail.count();
  assert.strictEqual(count, 0, "Hay imágenes adjuntas cuando no debería");
});

Then("el mensaje se envía sin imágenes", async function () {
  const sentImages = page.locator('img[alt^="Imagen adjunta"]');
  const count = await sentImages.count();
  assert.strictEqual(count, 0, "Se enviaron imágenes en el mensaje");
});
