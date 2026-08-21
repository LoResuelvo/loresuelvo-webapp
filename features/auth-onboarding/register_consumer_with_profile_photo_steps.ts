import { Given, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../support/world";
import { aPresignedUpload, aConfirmedFile } from "../support/factories";
import assert from "assert";

Given(
  "elegí la foto de perfil de consumidor {string} desde mi dispositivo",
  async function (this: CustomWorld, fileName: string) {
    await this.stubPost("/files/presign", 200, aPresignedUpload());
    await this.stubPost("/files/test-file-id/confirm", 200, aConfirmedFile());

    await this.stubPost("/consumers", 201, {
      id: 1,
      name: "Ana",
      surname: "Pérez",
      profile_photo_url: "http://localhost:3001/mock-s3-url/avatar.png",
    });

    await this.stubGet("/conversations", []);

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
