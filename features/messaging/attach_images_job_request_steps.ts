import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, APP_URL } from "../support/world";
import { ROUTES } from "../../lib/routes";
import { aPresignedUpload, aConfirmedFile } from "../support/factories";

let currentJobRequestAttachedImages: string[] = [];

async function stubFileUpload(world: CustomWorld, fileName: string, fileId: string = "mock-file-123") {
  await world.stubPost(
    "/files/presign",
    200,
    aPresignedUpload({
      file_id: fileId,
      upload_url: "https://mock-upload.test/upload",
      key: `job_request_image/${fileId}`,
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

Given("que adjunté la imagen {string} a la solicitud", async function (this: CustomWorld, imagen: string) {
  currentJobRequestAttachedImages.push(imagen);
  await stubFileUpload(this, imagen, "mock-file-123");

  const fileChooserPromise = this.page.waitForEvent("filechooser");
  await this.page.getByRole("button", { name: /Adjuntar imágenes/i }).click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles([
    {
      name: imagen,
      mimeType: "image/jpeg",
      buffer: Buffer.from("mock-image-data"),
    },
  ]);

  const thumbnail = this.page.getByRole("img", { name: `Vista previa de imagen ${imagen}` }).first();
  await thumbnail.waitFor({ state: "visible", timeout: 2000 });
});

Given(
  "que adjunté las imágenes {string}, {string} y {string} a la solicitud",
  async function (this: CustomWorld, img1: string, img2: string, img3: string) {
    currentJobRequestAttachedImages.push(img1, img2, img3);
    await stubFileUpload(this, img1, "mock-file-1");
    await stubFileUpload(this, img2, "mock-file-2");
    await stubFileUpload(this, img3, "mock-file-3");

    for (const img of [img1, img2, img3]) {
      const fileChooserPromise = this.page.waitForEvent("filechooser");
      await this.page.getByRole("button", { name: /Adjuntar imágenes/i }).click();
      const fileChooser = await fileChooserPromise;

      await fileChooser.setFiles([
        {
          name: img,
          mimeType: "image/jpeg",
          buffer: Buffer.from("mock-data"),
        },
      ]);

      const thumbnail = this.page.getByRole("img", { name: `Vista previa de imagen ${img}` }).first();
      await thumbnail.waitFor({ state: "visible", timeout: 2000 });
    }
  }
);

Given("que adjunté 3 imágenes a la solicitud", async function (this: CustomWorld) {
  const images = ["img1.jpg", "img2.jpg", "img3.jpg"];
  currentJobRequestAttachedImages.push(...images);
  await stubFileUpload(this, "img1.jpg", "mock-file-1");
  await stubFileUpload(this, "img2.jpg", "mock-file-2");
  await stubFileUpload(this, "img3.jpg", "mock-file-3");

  for (const img of images) {
    const fileChooserPromise = this.page.waitForEvent("filechooser");
    await this.page.getByRole("button", { name: /Adjuntar imágenes/i }).click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles([
      {
        name: img,
        mimeType: "image/jpeg",
        buffer: Buffer.from("mock-data"),
      },
    ]);

    const thumbnail = this.page.getByRole("img", { name: `Vista previa de imagen ${img}` }).first();
    await thumbnail.waitFor({ state: "visible", timeout: 2000 });
  }
});

When("intento adjuntar una cuarta imagen", async function (this: CustomWorld) {
  const button = this.page.getByRole("button", { name: /Adjuntar imágenes/i });
  await button.waitFor({ state: "visible" });
  const isDisabled = await button.isDisabled();

  if (!isDisabled) {
    const fileChooserPromise = this.page.waitForEvent("filechooser");
    await button.click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles([
      {
        name: "fourth.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from("mock-data"),
      },
    ]);
  }
});

Then("veo un mensaje de error indicando que se alcanzó el límite de imágenes", async function (this: CustomWorld) {
  const errorMsg = this.page.getByText(/límite.*imágenes|Máximo 3 imágenes/i).first();
  await errorMsg.waitFor({ state: "visible", timeout: 2000 });
  assert.ok(await errorMsg.isVisible(), "No se muestra el error de límite de imágenes");
});

Then("la cuarta imagen no se adjunta", async function (this: CustomWorld) {
  const thumbnail = this.page.getByRole("img", { name: `Vista previa de imagen fourth.jpg` });
  const isVisible = await thumbnail.isVisible().catch(() => false);
  assert.ok(!isVisible, "La cuarta imagen se adjuntó incorrectamente");
});

Given("que el consumidor envió una solicitud con la imagen {string}", async function (this: CustomWorld, imagen: string) {
  await this.stubGet("/job-requests", [
    {
      id: 7,
      conversation_id: 10,
      title: "Pérdida de agua",
      description: "El termotanque pierde agua por la base.",
      requester: {
        name: "Ana",
        surname: "Pérez",
      },
      images: [
        {
          id: "img-123",
          url: `/${imagen}`,
          original_name: imagen,
        },
      ],
    },
  ]);
});

async function setProviderSession(world: CustomWorld, providerName: string) {
  const [firstName, lastName] = providerName.split(" ");
  await world.setSession("provider", {
    id: "prov-001",
    email: "prestador@loresuelvo.test",
    firstName: firstName || "Juan",
    lastName: lastName || "Pérez",
    isOnboarded: true,
  });
}

Given("estoy autenticado como prestador {string}", async function (this: CustomWorld, providerName: string) {
  await setProviderSession(this, providerName);
});

When("visualizo el detalle de la solicitud de trabajo", async function (this: CustomWorld) {
  await this.page.goto(APP_URL + ROUTES.provider.home, { waitUntil: "networkidle" });

  const viewButton = this.page.getByRole("button", { name: "Ver Solicitud" }).first();
  await viewButton.waitFor({ state: "visible" });
  await viewButton.click();
});

Then("veo la imagen {string} en la solicitud", async function (this: CustomWorld, imagen: string) {
  const imgElement = this.page.locator(`img[alt="${imagen}"]`).first();
  await imgElement.waitFor({ state: "visible", timeout: 3000 });
  assert.ok(await imgElement.isVisible(), `La imagen ${imagen} no está visible en el detalle de la solicitud`);
});
