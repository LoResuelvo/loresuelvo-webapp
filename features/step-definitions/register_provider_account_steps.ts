import { Given, When, Then } from "@cucumber/cucumber";
import { page } from "./landing_page_visualization_steps";
import { setSelectedRole } from "./register_consumer_account_steps";
import assert from "assert";
import { ROUTES } from "../../lib/routes";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const PROVIDER_URL = APP_URL + ROUTES.provider.home;

When('entro al home de prestadores', async () => {
  await page.goto(PROVIDER_URL);
});

Given('elegí la opción de prestador en la pagina de registro', async () => {
  setSelectedRole("provider");

  await page.goto(APP_URL + ROUTES.onboarding);
  const providerButton = page.getByText("Soy Técnico").first();
  await providerButton.click();
  const continueButton = page.getByText("Continuar").first();
  await continueButton.click();
});

Given('ingreso mi nombre {string} y apellido {string} en el formulario', async (firstName: string, lastName: string) => {
  await page.getByLabel("Nombre").fill(firstName);
  await page.getByLabel("Apellido").fill(lastName);
});

Given('elegí el rubro {string} de la lista en la pagina de registro de LoResuelvo', async (rubro: string) => {
  const select = page.getByLabel("Rubro").or(page.locator("select")).first();
  await select.waitFor({ state: "visible" });
  await select.selectOption({ label: rubro });
});

Then('soy redirigido al home de prestadores', async () => {
  await page.waitForURL(`**${ROUTES.provider.home}`);
  assert.ok(page.url().endsWith(ROUTES.provider.home), `Se esperaba estar en ${ROUTES.provider.home} pero se está en ${page.url()}`);
});

Then('veo un mensaje de error {string}', async (errorMessage: string) => {
  const errorText = page.getByText(errorMessage).first();
  await errorText.waitFor({ state: "visible" });
  assert.ok(await errorText.isVisible(), `No se encontró el mensaje de error: "${errorMessage}"`);
});

Then('permanezco en la página de registro', async () => {
  const expectedUrl = APP_URL + ROUTES.onboarding;
  assert.equal(page.url().replace(/\/$/, ""), expectedUrl.replace(/\/$/, ""), `No se permaneció en la página de registro`);
});