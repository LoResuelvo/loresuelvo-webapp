import { Given, Then } from "@cucumber/cucumber";
import assert from "assert";
import { ROUTES } from "../../lib/routes";
import { aCategory, aProviderSearchResult } from "../support/factories";
import { CustomWorld } from "../support/world";

function providerCard(world: CustomWorld, name: string) {
  return world.page.locator(".provider-card").filter({ hasText: name });
}

Given("que la búsqueda de {string} incluye a {string} con identidad verificada", async function (this: CustomWorld, category: string, fullName: string) {
  const [name, ...surname] = fullName.split(" ");
  await this.stubGet("/categories", [aCategory({ id: 1, name: category })]);
  await this.stubGet("/providers?category_id=1", [
    aProviderSearchResult({ id: 1, name, surname: surname.join(" "), identity_verified: true }),
  ]);
});

Given("incluye a {string} sin identidad verificada", async function (this: CustomWorld, fullName: string) {
  const [name, ...surname] = fullName.split(" ");
  const stub = (await this.getStubs()).find((entry) => entry.endpoint === "/providers?category_id=1");
  assert.ok(stub && Array.isArray(stub.body));
  const providers: unknown[] = stub.body;
  await this.stubGet("/providers?category_id=1", [
    ...providers,
    aProviderSearchResult({ id: 2, name, surname: surname.join(" "), identity_verified: false }),
  ]);
});

Then("visualizo {string} en la tarjeta de {string}", async function (this: CustomWorld, label: string, name: string) {
  await providerCard(this, name).getByText(label, { exact: true }).waitFor({ state: "visible" });
});

Then("no visualizo ese indicador en la tarjeta de {string}", async function (this: CustomWorld, name: string) {
  const card = providerCard(this, name);
  await card.waitFor({ state: "visible" });
  assert.equal(await card.getByText("Identidad verificada", { exact: true }).count(), 0);
});

Then("ambos prestadores conservan sus acciones de contacto y acceso al perfil", async function (this: CustomWorld) {
  for (const [name, id] of [["Juan Pérez", 1], ["Pedro Dib", 2]] as const) {
    const card = providerCard(this, name);
    assert.ok(await card.getByRole("button", { name: "Contactar", exact: true }).isEnabled());
    const profile = card.getByRole("link", { name: `Ver perfil ${name}`, exact: true });
    assert.equal(await profile.getAttribute("href"), ROUTES.consumer.providerProfile(id));
  }
});
