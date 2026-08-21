import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, visibleTimeout, attachedTimeout, waitTimeout, attachedState } from "../support/world";
import { aPresignedUpload, aConfirmedFile, aConversationDetail, aConversationMessage, aMessageImage, aCounterpart } from "../support/factories";

let currentAttachedImages: string[] = [];

async function stubFileUpload(world: CustomWorld, fileName: string, fileId: string = "mock-file-123") {
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

async function triggerFileChooser(world: CustomWorld) {
  const menuBtn = world.page.getByLabel("Abrir menú de acciones");
  await menuBtn.waitFor({ state: "visible" });

  const menu = world.page.getByRole("menu");
  for (let i = 0; i < 5; i++) {
    await menuBtn.click();
    try {
      await menu.waitFor(visibleTimeout);
      break;
    } catch {
      await world.page.waitForTimeout(500);
    }
  }

  const fileChooserPromise = world.page.waitForEvent("filechooser");
  const option = world.page.getByRole("menuitem", { name: "Adjuntar imágenes" });
  await option.waitFor({ state: "visible" });
  await option.click();

  return await fileChooserPromise;
}

Given("que adjunté la imagen {string}", async function (this: CustomWorld, imagen: string) {
  currentAttachedImages.push(imagen);
  await stubFileUpload(this, imagen);

  const fileChooser = await triggerFileChooser(this);

  const fileData = { name: imagen, mimeType: "image/jpeg", buffer: Buffer.from("mock-image-data") };
  await fileChooser.setFiles([fileData]);

  const thumbnail = this.page.getByRole("img", { name: `Vista previa de ${imagen}` });
  await thumbnail.waitFor(visibleTimeout).catch(() => {});
});

Given("que adjunté las imágenes {string} y {string}", async function (this: CustomWorld, img1: string, img2: string) {
  currentAttachedImages.push(img1, img2);
  await stubFileUpload(this, img1, "mock-file-1");
  await stubFileUpload(this, img2, "mock-file-2");

  const fileChooser = await triggerFileChooser(this);

  await fileChooser.setFiles([
    { name: img1, mimeType: "image/jpeg", buffer: Buffer.from("mock1") },
    { name: img2, mimeType: "image/jpeg", buffer: Buffer.from("mock2") },
  ]);
});

When("adjunto la imagen {string} que supera los 5MB", async function (this: CustomWorld, imagen: string) {
  const fileChooser = await triggerFileChooser(this);

  const largeBuffer = Buffer.alloc(5.1 * 1024 * 1024);

  const fileData = { name: imagen, mimeType: "image/jpeg", buffer: largeBuffer };
  await fileChooser.setFiles([fileData]);
});

Given("que eliminé la imagen {string} de los archivos adjuntos", async function (this: CustomWorld, imagen: string) {
  currentAttachedImages = currentAttachedImages.filter((img) => img !== imagen);
  const deleteBtn = this.page.getByRole("button", { name: `Eliminar ${imagen}` });
  await deleteBtn.click();
});

When("envío el mensaje {string}", async function (this: CustomWorld, mensaje: string) {
  await this.stubPost("/conversations/1/messages", 201, aConversationMessage({
    id: 999,
    sender_role: "consumer",
    content: mensaje,
    images: currentAttachedImages.map((name, idx) => aMessageImage({
      id: `mock-file-${idx}`,
      url: `/${name}`,
      original_name: name,
    })),
    created_on: new Date().toISOString(),
  }));

  currentAttachedImages = [];

  const input = this.page.getByRole("textbox", { name: /escribe un mensaje/i });
  await input.fill(mensaje);

  const sendButton = this.page.getByRole("button", { name: /enviar/i });
  await sendButton.click();
});

When("envío el mensaje sin texto", async function (this: CustomWorld) {
  await this.stubPost("/conversations/1/messages", 201, aConversationMessage({
    id: 999,
    sender_role: "consumer",
    content: "",
    images: currentAttachedImages.map((name, idx) => aMessageImage({
      id: `mock-file-${idx}`,
      url: `/${name}`,
      original_name: name,
    })),
    created_on: new Date().toISOString(),
  }));

  currentAttachedImages = [];

  const sendButton = this.page.getByRole("button", { name: /enviar/i });
  await sendButton.click();
});

Then("el sistema registra y muestra el mensaje con la imagen {string}", async function (this: CustomWorld, imagen: string) {
  const sentImage = this.page.getByRole("img", { name: `Imagen adjunta ${imagen}` }).first();
  await sentImage.waitFor(visibleTimeout);
  assert.ok(await sentImage.isVisible(), `La imagen ${imagen} no se muestra en el chat`);
});

Then(
  "el sistema registra y muestra el mensaje con las imágenes {string} y {string}",
  async function (this: CustomWorld, img1: string, img2: string) {
    const sentImage1 = this.page.getByRole("img", { name: `Imagen adjunta ${img1}` }).first();
    const sentImage2 = this.page.getByRole("img", { name: `Imagen adjunta ${img2}` }).first();

    await sentImage1.waitFor(visibleTimeout);
    await sentImage2.waitFor(visibleTimeout);

    assert.ok(await sentImage1.isVisible(), `La imagen ${img1} no se muestra en el chat`);
    assert.ok(await sentImage2.isVisible(), `La imagen ${img2} no se muestra en el chat`);
  }
);

Given("que el consumidor envió un mensaje con la imagen {string}", async function (this: CustomWorld, imagen: string) {
  await this.stubGet(`/conversations/1`, aConversationDetail({
    id: 1,
    status: "accepted",
    counterpart: aCounterpart({ id: "consumer-001", role: "consumer", name: "Ana", surname: "Pérez", category_name: "Plomería" }),
    messages: [
      aConversationMessage({
        id: 1,
        sender_role: "consumer",
        content: "Hola",
        images: [aMessageImage({ id: "file-xyz", url: "/img.jpg", original_name: imagen })],
        created_on: new Date().toISOString(),
      }),
    ],
    updated_on: new Date().toISOString(),
  }));
  await this.page.reload({ waitUntil: "networkidle" });
});

Then("el detalle del mensaje en pantalla incluye la imagen {string}", async function (this: CustomWorld, imagen: string) {
  const receivedImage = this.page.locator(`img[alt*="${imagen}"]`).first();
  await receivedImage.waitFor(visibleTimeout);
  assert.ok(await receivedImage.isVisible(), `El detalle no incluye la imagen ${imagen}`);
});

When(
  "el consumidor {string} me envía un mensaje con la imagen {string}",
  async function (this: CustomWorld, nombre: string, imagen: string) {
    let wsServer = (global as any).wsServer;
    let attempts = 0;
    while (!wsServer && attempts < 100) {
      await new Promise((r) => setTimeout(r, 100));
      wsServer = (global as any).wsServer;
      attempts++;
    }
    if (!wsServer) throw new Error("No hay WebSocket interceptado para enviar el mensaje con imagen");
    wsServer.send(
      JSON.stringify({
        type: "conversation.message.created",
        conversation_id: 1,
        message: aConversationMessage({
          id: 200,
          content: "Mensaje WS",
          sender_role: "consumer",
          images: [aMessageImage({ id: "mock-file-123", url: "/perdida-bajo-mesada.jpg", original_name: imagen })],
          created_on: new Date().toISOString(),
        }),
      })
    );
  }
);

Then(
  "veo el mensaje con la imagen {string} en la pantalla del chat sin recargar la página",
  async function (this: CustomWorld, imagen: string) {
    const receivedImage = this.page.locator(`img[alt*="${imagen}"]`).first();
    await receivedImage.waitFor(visibleTimeout);
    assert.ok(await receivedImage.isVisible(), `La imagen WS ${imagen} no se mostró en realtime`);
  }
);

Then("veo un mensaje de error indicando que la imagen es muy grande", async function (this: CustomWorld) {
  const errorMsg = this.page.getByText(/no debe superar los 5MB/i);
  await errorMsg.waitFor(visibleTimeout);
  assert.ok(await errorMsg.isVisible(), "No se muestra el error de tamaño");
});

Then("la imagen no se adjunta al mensaje", async function (this: CustomWorld) {
  const thumbnail = this.page.locator('img[alt^="Vista previa"]');
  const count = await thumbnail.count();
  assert.strictEqual(count, 0, "Hay imágenes adjuntas cuando no debería");
});

Then("el mensaje se envía sin imágenes", async function (this: CustomWorld) {
  const sentImages = this.page.locator('img[alt^="Imagen adjunta"]');
  const count = await sentImages.count();
  assert.strictEqual(count, 0, "Se enviaron imágenes en el mensaje");
});
