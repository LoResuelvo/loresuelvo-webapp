import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld, APP_URL } from "../support/world";
import { setSelectedRole } from "./register_consumer_account_steps";
import { aCategory } from "../support/factories";
import assert from "assert";
import { ROUTES } from "../../lib/routes";

const PROVIDER_URL = APP_URL + ROUTES.provider.home;

When("entro al home de prestadores", async function (this: CustomWorld) {
  await this.stubGet("/categories", [aCategory({ id: 1, name: "Plomería" })]);
  await this.page.goto(PROVIDER_URL);
});

Given("elegí la opción de prestador en la pagina de registro", async function (this: CustomWorld) {
  setSelectedRole("provider");

  await this.stubGet("/categories", [aCategory({ id: 1, name: "Plomería" })]);
  if (!(await this.hasApiStub("GET", "/coverage-zones"))) {
    await this.stubGet("/coverage-zones", [{ id: 1, name: "Comuna 1" }]);
  }

  await this.page.goto(APP_URL + ROUTES.onboarding);
  const providerButton = this.page.getByText("Soy Prestador").first();
  await providerButton.click();
  const continueButton = this.page.getByText("Continuar").first();
  await continueButton.click();
});

Given(
  "ingreso mi nombre {string} y apellido {string} en el formulario",
  async function (this: CustomWorld, firstName: string, lastName: string) {
    (this as any).registeredFirstName = firstName;
    (this as any).registeredLastName = lastName;
    await this.page.getByLabel("Nombre").fill(firstName);
    await this.page.getByLabel("Apellido").fill(lastName);
  }
);

Given(
  "elegí el rubro {string} de la lista en la pagina de registro de LoResuelvo",
  async function (this: CustomWorld, rubro: string) {
    const select = this.page.getByLabel("Rubro").or(this.page.locator("select")).first();
    await select.waitFor();
    await select.selectOption(rubro);
  }
);

Then("soy redirigido al home de prestadores", async function (this: CustomWorld) {
  await this.page.waitForURL(`**${ROUTES.provider.home}`);
  assert.ok(
    this.page.url().endsWith(ROUTES.provider.home),
    `Se esperaba estar en ${ROUTES.provider.home} pero se está en ${this.page.url()}`
  );
});

Then("veo un mensaje de error {string}", async function (this: CustomWorld, errorMessage: string) {
  const errorText = this.page.getByText(errorMessage).first();
  await errorText.waitFor();
  assert.ok(await errorText.isVisible(), `No se encontró el mensaje de error: "${errorMessage}"`);
});

Then("permanezco en la página de registro", async function (this: CustomWorld) {
  const expectedUrl = APP_URL + ROUTES.onboarding;
  assert.equal(
    this.page.url().replace(/\/$/, ""),
    expectedUrl.replace(/\/$/, ""),
    `No se permaneció en la página de registro`
  );
});