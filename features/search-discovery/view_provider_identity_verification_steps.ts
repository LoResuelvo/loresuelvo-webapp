import { Given, Then, When } from "@cucumber/cucumber";
import assert from "assert";
import { ROUTES } from "../../lib/routes";
import { aCategory, aProviderProfile, aProviderSearchResult } from "../support/factories";
import { CustomWorld } from "../support/world";

function providerCard(world: CustomWorld, name: string) {
  return world.page.locator(".provider-card").filter({ hasText: name });
}

Given("que el perfil público de {string} está disponible con identidad verificada", async function (this: CustomWorld, fullName: string) {
  const [name, ...surname] = fullName.split(" ");
  await this.stubGet("/providers/1", aProviderProfile({ name, surname: surname.join(" "), identity_verified: true }));
});

Given("que el perfil público de {string} está disponible sin identidad verificada", async function (this: CustomWorld, fullName: string) {
  const [name, ...surname] = fullName.split(" ");
  await this.stubGet("/providers/1", aProviderProfile({ name, surname: surname.join(" "), identity_verified: false }));
});

Then("visualizo su información pública", async function (this: CustomWorld) {
  const presentation = this.page.getByRole("region", { name: "Pedro Dib", exact: true });
  await presentation.waitFor({ state: "visible" });
  assert.ok(await presentation.getByText("Plomería", { exact: false }).isVisible());
});

Then("no visualizo el indicador {string}", async function (this: CustomWorld, label: string) {
  assert.equal(await this.page.getByText(label, { exact: true }).count(), 0);
});

Then("no visualizo mensajes de rechazo o advertencias sobre su identidad", async function (this: CustomWorld) {
  const profile = this.page.getByRole("main");
  assert.ok(!/identidad|verificaci[oó]n|rechaz|advertencia/i.test(await profile.innerText()));
  assert.equal(await profile.getByRole("alert").count(), 0);
});

Then("visualizo {string} junto a su información de presentación", async function (this: CustomWorld, label: string) {
  const presentation = this.page.getByRole("region", { name: "Juan Pérez", exact: true });
  await presentation.getByText(label, { exact: true }).waitFor({ state: "visible" });
});

Then("puedo leer el indicador sin depender exclusivamente de su color o icono", async function (this: CustomWorld) {
  const indicator = this.page.getByText("Identidad verificada", { exact: true });
  assert.equal(await indicator.innerText(), "Identidad verificada");
  assert.equal(await indicator.locator("..").locator("svg").getAttribute("aria-hidden"), "true");

});

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

function internalVerificationData() {
  return {
    identity_verification_status: "synthetic-internal-approved",
    identity_verified_on: "2099-01-02T03:04:05Z",
    identity_verification_session_id: "synthetic-private-session",
    identity_document: { number: "synthetic-private-document", url: "synthetic-private-document.pdf" },
  };
}

Given("que {string} tiene su identidad verificada", async function (this: CustomWorld, fullName: string) {
  const [name, ...surname] = fullName.split(" ");
  await this.stubGet("/categories", [aCategory({ id: 1, name: "Plomería" })]);
  await this.stubGet("/providers?category_id=1", [aProviderSearchResult({ name, surname: surname.join(" "), identity_verified: true })]);
  await this.stubGet("/providers/1", aProviderProfile({ name, surname: surname.join(" "), identity_verified: true }));
});

Given("la respuesta de la consulta incluye datos internos de verificación que no pertenecen al contrato público", async function (this: CustomWorld) {
  for (const stub of await this.getStubs()) {
    if (stub.endpoint === "/providers?category_id=1" && Array.isArray(stub.body)) {
      await this.stubGet(stub.endpoint, stub.body.map((provider: object) => ({ ...provider, ...internalVerificationData() })));
    } else if (stub.endpoint === "/providers/1") {
      assert.ok(stub.body && typeof stub.body === "object");
      await this.stubGet(stub.endpoint, { ...stub.body, ...internalVerificationData() });
    }
  }
});

When(/^consulto a "([^"]+)" en (los resultados de búsqueda|el perfil público)$/, async function (this: CustomWorld, fullName: string, surface: string) {
  assert.equal(fullName, "Juan Pérez");
  const route = surface === "el perfil público" ? ROUTES.consumer.providerProfile(1) : `${ROUTES.consumer.buscar}?category_id=1`;
  await this.page.goto(`${this.appUrl}${route}`);
});

Then("visualizo únicamente el indicador público {string} sobre su verificación", async function (this: CustomWorld, label: string) {
  const indicator = this.page.getByRole("main").getByText(label, { exact: true });
  await indicator.waitFor({ state: "visible" });
  assert.equal(await indicator.count(), 1);
});

Then("no visualizo estados internos, fecha de aprobación, identificadores de sesión ni documentos de identidad", async function (this: CustomWorld) {
  const visibleContent = await this.page.getByRole("main").innerText();
  assert.doesNotMatch(visibleContent, /synthetic-internal-approved|2099-01-02|synthetic-private-session|synthetic-private-document/);
  assert.doesNotMatch(visibleContent, /identity_verification_status|identity_verified_on|identity_verification_session_id|identity_document/);
});
