import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../support/world";
import assert from "assert";

async function selectFile(world: CustomWorld, fileName: string, sizeInMB: number = 1) {
  const fileInput = world.page.locator('input[type="file"]');
  await fileInput.waitFor({ state: "attached" });

  const sizeInBytes = sizeInMB * 1024 * 1024;
  const buffer = Buffer.alloc(sizeInBytes, "a");

  let mimeType = "image/png";
  if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
    mimeType = "image/jpeg";
  } else if (fileName.endsWith(".pdf")) {
    mimeType = "application/pdf";
  } else if (fileName.endsWith(".webp")) {
    mimeType = "image/webp";
  }

  await fileInput.setInputFiles({
    name: fileName,
    mimeType: mimeType,
    buffer: buffer,
  });
}

Given(
  "elegí la foto de perfil {string} desde mi dispositivo",
  async function (this: CustomWorld, fileName: string) {
    await this.addApiStub({
      method: "POST",
      endpoint: "/files/presign",
      status: 200,
      body: {
        file_id: "test-file-id",
        key: "test-key",
        upload_url: "http://localhost:3000/mock-s3-upload",
        headers: {},
      },
    });

    await this.addApiStub({
      method: "POST",
      endpoint: "/files/test-file-id/confirm",
      status: 200,
      body: {
        id: "test-file-id",
        url: "http://localhost:3000/mock-s3-url/avatar.png",
        original_name: "avatar.png",
      },
    });

    await this.addApiStub({
      method: "POST",
      endpoint: "/providers",
      status: 201,
      body: {
        id: 1,
        profile_photo_url: "http://localhost:3000/mock-s3-url/avatar.png",
      },
    });

    await this.addApiStub({
      method: "GET",
      endpoint: "/job-requests",
      status: 200,
      body: [],
    });

    // We use this to mock the S3 upload
    await this.page.route("**/mock-s3-upload", async (route, request) => {
      if (request.method() === "PUT") {
        await route.fulfill({ status: 200 });
      } else {
        await route.continue();
      }
    });

    await selectFile(this, fileName);
  }
);

When(
  "selecciono la foto de perfil {string} desde mi dispositivo",
  async function (this: CustomWorld, fileName: string) {
    await selectFile(this, fileName);
  }
);

When(
  "selecciono la foto de perfil {string} de {int}MB desde mi dispositivo",
  async function (this: CustomWorld, fileName: string, sizeInMB: number) {
    await selectFile(this, fileName, sizeInMB);
  }
);

Then("veo una vista previa de la foto seleccionada", async function (this: CustomWorld) {
  const preview = this.page
    .locator('img[data-testid="profile-photo-preview"]')
    .or(this.page.locator('img[alt="Vista previa"]'))
    .first();

  await preview.waitFor({ state: "visible" });
  assert.ok(await preview.isVisible(), "La vista previa de la foto seleccionada no es visible.");
});

Then("veo mi foto de perfil en el encabezado", async function (this: CustomWorld) {
  const headerAvatar = this.page
    .locator('header img[data-testid="header-profile-photo"]')
    .or(this.page.locator('header img[alt*="perfil"]'))
    .first();

  await headerAvatar.waitFor({ state: "attached" });
  assert.ok(await headerAvatar.isVisible(), "La foto de perfil del prestador no se visualiza en el encabezado.");
});
