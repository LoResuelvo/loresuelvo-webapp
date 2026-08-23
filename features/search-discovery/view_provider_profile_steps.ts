import { Given, Then, When } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, APP_URL } from "../support/world";
import { ROUTES } from "../../lib/routes";
import { aCategory, aProvider, aProviderProfile } from "../support/factories";

function splitProviderName(fullName: string): { name: string; surname: string } {
  const [name, ...surnameParts] = fullName.trim().split(/\s+/);
  return { name, surname: surnameParts.join(" ") };
}

Given("que soy un consumidor autenticado", async function (this: CustomWorld) {
  await this.setSession("consumer");
});

Given(
  "que estoy viendo los resultados de prestadores de {string}",
  async function (this: CustomWorld, categoryName: string) {
    await this.stubGet("/categories", [aCategory({ id: 1, name: categoryName })]);
  },
);

Given(
  "el resultado incluye al prestador {string}",
  async function (this: CustomWorld, providerName: string) {
    const { name, surname } = splitProviderName(providerName);
    await this.stubGet("/providers?category_id=1", [
      aProvider({ id: 1, name, surname, category_name: "Plomería" }),
    ]);
  },
);

Given(
  "el perfil de {string} está disponible con foto",
  async function (this: CustomWorld, providerName: string) {
    const { name, surname } = splitProviderName(providerName);
    await this.stubGet(
      "/providers/1",
      aProviderProfile({ name, surname, category: { id: 1, name: "Plomería" } }),
    );
  },
);

When(
  "selecciono {string} para el prestador {string}",
  async function (this: CustomWorld, _action: string, providerName: string) {
    await this.page.goto(`${APP_URL}${ROUTES.consumer.buscar}?category_id=1`);
    await this.page.waitForLoadState("networkidle");

    const providerCard = this.page.locator(".provider-card").filter({ hasText: providerName }).first();
    await providerCard.getByRole("button", { name: /ver perfil/i }).click();
  },
);

Then(
  "soy redirigido al perfil de {string}",
  async function (this: CustomWorld, _providerName: string) {
    await this.page.waitForURL(/\/consumidor\/prestadores\/\d+/, { timeout: 5000 });
  },
);

Then(
  "visualizo el nombre completo {string}",
  async function (this: CustomWorld, providerName: string) {
    const heading = this.page.getByRole("heading", { name: providerName });
    await heading.waitFor({ state: "visible" });
    assert.ok(await heading.isVisible());
  },
);

Then(
  "visualizo la foto de perfil de {string}",
  async function (this: CustomWorld, providerName: string) {
    const photo = this.page.getByRole("img", { name: new RegExp(providerName, "i") });
    await photo.waitFor({ state: "visible" });
    assert.ok(await photo.isVisible());
  },
);

Then(
  "visualizo el rubro {string}",
  async function (this: CustomWorld, categoryName: string) {
    const category = this.page.getByText(categoryName, { exact: true });
    await category.waitFor({ state: "visible" });
    assert.ok(await category.isVisible());
  },
);
