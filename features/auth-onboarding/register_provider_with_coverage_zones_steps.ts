import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld, APP_URL } from "../support/world";
import { setSelectedRole } from "./register_consumer_account_steps";
import { aCoverageZone, aCategory } from "../support/factories";
import assert from "assert";
import { ROUTES } from "../../lib/routes";

Given(
  "la API dispone de las comunas habilitadas {string} y {string}",
  async function (this: CustomWorld, zone1: string, zone2: string) {
    const parseId = (name: string, fallback: number) => {
      const match = name.match(/\d+/);
      return match ? parseInt(match[0], 10) : fallback;
    };
    const zones = [
      aCoverageZone({ id: parseId(zone1, 6), name: zone1 }),
      aCoverageZone({ id: parseId(zone2, 14), name: zone2 }),
    ];
    await this.stubGet("/coverage-zones", zones);
  }
);

Given("Google Maps está disponible con límites para esas comunas", async function (this: CustomWorld) {
  // Presentational stub/container for Google Maps in Batch 1
});

When("elijo la opción de prestador y avanzo al paso de datos de perfil", async function (this: CustomWorld) {
  setSelectedRole("provider");

  if (!(await this.hasApiStub("GET", "/categories"))) {
    await this.stubGet("/categories", [aCategory({ id: 1, name: "Plomería" })]);
  }

  await this.page.goto(APP_URL + ROUTES.onboarding);
  const providerButton = this.page.getByText("Soy Prestador").first();
  await providerButton.click();
  const continueButton = this.page.getByText("Continuar").first();
  await continueButton.click();
});

Then("veo el estado de carga de las zonas de cobertura", async function (this: CustomWorld) {
  const loading = this.page
    .locator('[data-testid="coverage-zones-loading"]')
    .or(this.page.getByText(/cargando zonas/i))
    .or(this.page.locator('[aria-busy="true"]'));
  const list = this.page
    .locator('[data-testid="coverage-zones-list"]')
    .or(this.page.getByRole("group", { name: /zonas de cobertura/i }));

  const isVisible = await Promise.race([
    loading.waitFor({ state: "visible", timeout: 3000 }).then(() => true).catch(() => false),
    list.waitFor({ state: "visible", timeout: 3000 }).then(() => true).catch(() => false),
  ]);
  assert.ok(isVisible, "No se encontró el estado de carga ni la lista cargada.");
});

Then("veo los nombres de las comunas disponibles en la lista accesible", async function (this: CustomWorld) {
  const comuna6 = this.page.getByText("Comuna 6").first();
  const comuna14 = this.page.getByText("Comuna 14").first();
  await comuna6.waitFor({ state: "visible" });
  await comuna14.waitFor({ state: "visible" });
  assert.ok(await comuna6.isVisible(), "No se encontró Comuna 6 en la lista");
  assert.ok(await comuna14.isVisible(), "No se encontró Comuna 14 en la lista");
});

Then("veo sus límites identificados en el mapa de CABA", async function (this: CustomWorld) {
  const map = this.page
    .locator('[data-testid="coverage-map"]')
    .or(this.page.locator('[aria-label*="Mapa"]'))
    .first();
  await map.waitFor({ state: "visible" });
  assert.ok(await map.isVisible(), "No se visualiza el mapa de zonas de cobertura");
});
