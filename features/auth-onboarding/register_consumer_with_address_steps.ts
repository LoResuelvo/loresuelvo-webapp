import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../support/world";
import { anApiError } from "../support/factories";
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

Given(
  "ingreso la calle {string} y el número {string}",
  async function (this: CustomWorld, street: string, streetNumber: string) {
    (this as any).explicitAddressSet = true;
    await this.page.getByLabel("Calle").fill(street);
    await this.page.getByLabel("Número").fill(streetNumber);
  }
);

Given(
  "ingreso la calle {string}, número {string}, piso {string} y departamento {string}",
  async function (this: CustomWorld, street: string, streetNumber: string, floor: string, unit: string) {
    (this as any).explicitAddressSet = true;
    await this.page.getByLabel("Calle").fill(street);
    await this.page.getByLabel("Número").fill(streetNumber);
    await this.page.getByLabel("Piso").fill(floor);
    await this.page.getByLabel("Departamento").fill(unit);
  }
);

Given(
  "ingreso el número {string} pero dejo la calle vacía",
  async function (this: CustomWorld, streetNumber: string) {
    (this as any).explicitAddressSet = true;
    const streetInput = this.page.getByLabel("Calle").first();
    await streetInput.waitFor({ state: "visible" });
    await streetInput.fill("");
    const numberInput = this.page.getByLabel("Número").first();
    await numberInput.waitFor({ state: "visible" });
    await numberInput.fill(streetNumber);
  }
);

Given(
  "ingreso la calle {string} pero dejo el número vacío",
  async function (this: CustomWorld, street: string) {
    (this as any).explicitAddressSet = true;
    const streetInput = this.page.getByLabel("Calle").first();
    await streetInput.waitFor({ state: "visible" });
    await streetInput.fill(street);
    const numberInput = this.page.getByLabel("Número").first();
    await numberInput.waitFor({ state: "visible" });
    await numberInput.fill("");
  }
);

Given("la API responde que la dirección no pudo geolocalizarse", async function (this: CustomWorld) {
  await this.stubPost("/consumers", 400, anApiError("Address could not be validated"));
});

Then(
  "veo el mensaje de error {string} debajo del campo {string}",
  async function (this: CustomWorld, errorMessage: string, fieldName: string) {
    const input = this.page.getByLabel(fieldName).first();
    await input.waitFor({ state: "visible" });
    const container = input.locator("xpath=..");
    const error = container.getByRole("alert");
    await error.waitFor({ state: "visible" });
    const text = await error.textContent();
    assert.ok(
      text?.includes(errorMessage),
      `Se esperaba el mensaje "${errorMessage}" debajo de "${fieldName}" pero se encontró "${text}"`
    );
  }
);
