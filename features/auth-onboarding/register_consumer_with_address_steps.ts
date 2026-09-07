import { When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../support/world";
import assert from "assert";

When("avanzo al paso de datos de perfil", async function (this: CustomWorld) {
  const continueButton = this.page.getByRole("button", { name: /continuar/i }).first();
  if (await continueButton.isVisible().catch(() => false)) {
    await continueButton.click();
  }
  await this.page.waitForSelector('input[name="firstName"]');
});

Then(
  "veo los campos {string}, {string}, {string} y {string}",
  async function (this: CustomWorld, field1: string, field2: string, field3: string, field4: string) {
    for (const fieldName of [field1, field2, field3, field4]) {
      const input = this.page.getByLabel(fieldName).first();
      await input.waitFor({ state: "visible", timeout: 5000 });
      assert.ok(await input.isVisible(), `No se encontró el campo visible "${fieldName}"`);
    }
  }
);

Then(
  "{string} y {string} son obligatorios",
  async function (this: CustomWorld, field1: string, field2: string) {
    for (const fieldName of [field1, field2]) {
      const input = this.page.getByLabel(fieldName).first();
      await input.waitFor({ state: "attached", timeout: 5000 });
      const isRequired = await input.evaluate((el: HTMLInputElement) => el.required || el.getAttribute("aria-required") === "true");
      assert.ok(isRequired, `El campo "${fieldName}" debería ser obligatorio`);
    }
  }
);

Then(
  "{string} y {string} son opcionales",
  async function (this: CustomWorld, field1: string, field2: string) {
    for (const fieldName of [field1, field2]) {
      const input = this.page.getByLabel(fieldName).first();
      await input.waitFor({ state: "attached", timeout: 5000 });
      const isRequired = await input.evaluate((el: HTMLInputElement) => el.required || el.getAttribute("aria-required") === "true");
      assert.ok(!isRequired, `El campo "${fieldName}" debería ser opcional`);
    }
  }
);
