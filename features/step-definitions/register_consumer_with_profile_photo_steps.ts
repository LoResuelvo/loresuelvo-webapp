import { Given, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../support/world";
import assert from "assert";

Given(
  "elegí la foto de perfil de consumidor {string} desde mi dispositivo",
  async function (this: CustomWorld, fileName: string) {
    await this.addApiStub({
      method: "POST",
      endpoint: "/files/presign",
      status: 200,
      body: {
        file_id: "test-file-id",
        key: "test-key",
        upload_url: "http://localhost:3001/mock-s3-upload",
        headers: {},
      },
    });

    await this.addApiStub({
      method: "POST",
      endpoint: "/files/test-file-id/confirm",
      status: 200,
      body: {
        id: "test-file-id",
        url: "http://localhost:3001/mock-s3-url/avatar.png",
        original_name: "avatar.png",
      },
    });

    await this.addApiStub({
      method: "POST",
      endpoint: "/consumers",
      status: 201,
      body: {
        id: 1,
        name: "Ana",
        surname: "Pérez",
        profile_photo_url: "http://localhost:3001/mock-s3-url/avatar.png",
      },
    });

    await this.addApiStub({
      method: "GET",
      endpoint: "/conversations",
      status: 200,
      body: [],
    });

    await this.page.route("**/mock-s3-upload", async (route, request) => {
      if (request.method() === "PUT") {
        await route.fulfill({ status: 200 });
      } else {
        await route.continue();
      }
    });

    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.waitFor({ state: "attached" });
    const buffer = Buffer.alloc(1 * 1024 * 1024, "a");
    let mimeType = "image/png";
    if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) mimeType = "image/jpeg";
    await fileInput.setInputFiles({ name: fileName, mimeType, buffer });
  }
);

Then("veo mi foto de perfil en el encabezado del consumidor", async function (this: CustomWorld) {
  const headerAvatar = this.page
    .locator('header img[data-testid="header-profile-photo"]')
    .or(this.page.locator('header img[alt*="perfil"]'))
    .first();
  await headerAvatar.waitFor({ state: "attached" });
  assert.ok(await headerAvatar.isVisible(), "La foto de perfil del consumidor no se visualiza en el encabezado.");
});
