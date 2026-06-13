import { Given, When, Then } from "@cucumber/cucumber";
import { page } from "./landing_page_visualization_steps";
import assert from "assert";


async function selectFile(fileName: string, sizeInMB: number = 1) {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.waitFor({ state: "visible" });

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

Given('elegí la foto de perfil {string} desde mi dispositivo', async (fileName: string) => {
  await selectFile(fileName);
});

When('selecciono la foto de perfil {string} desde mi dispositivo', async (fileName: string) => {
  await selectFile(fileName);
});

When('selecciono la foto de perfil {string} de {int}MB desde mi dispositivo', async (fileName: string, sizeInMB: number) => {
  await selectFile(fileName, sizeInMB);
});

Then('veo una vista previa de la foto seleccionada', async () => {
  const preview = page.locator('img[data-testid="profile-photo-preview"]')
    .or(page.locator('img[alt="Vista previa"]'))
    .first();

  await preview.waitFor({ state: "visible" });
  assert.ok(await preview.isVisible(), "La vista previa de la foto seleccionada no es visible.");
});

Then('veo mi foto de perfil en el encabezado', async () => {
  const headerAvatar = page.locator('header img[data-testid="header-profile-photo"]')
    .or(page.locator('header img[alt*="perfil"]'))
    .first();

  await headerAvatar.waitFor({ state: "visible" });
  assert.ok(await headerAvatar.isVisible(), "La foto de perfil del prestador no se visualiza en el encabezado.");
});
