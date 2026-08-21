import { Given, Then, When } from "@cucumber/cucumber";
import { CustomWorld, APP_URL } from "../support/world";
import { aCurrentUser } from "../support/factories";
import assert from "assert";
import { ROUTES } from "../../lib/routes";

const AUTH0_LOGIN_URL = ROUTES.auth.login;
const CONSUMER_URL = APP_URL + ROUTES.consumer.home;

let registeredEmail = "";
let registeredFirstName = "";
let registeredLastName = "";

Given("que no inicié sesión en Auth0", async function (this: CustomWorld) {
  await this.page.context().clearCookies();
});

Given(
  "previamente me registre exitosamente con el mail {string}, nombre {string} y apellido {string}",
  async function (this: CustomWorld, email: string, firstName: string, lastName: string) {
    registeredEmail = email;
    registeredFirstName = firstName;
    registeredLastName = lastName;
  }
);

Then("soy redirigido al portal de autenticación de Auth0 para iniciar sesión", async function (this: CustomWorld) {
  if (this.page.url().includes(AUTH0_LOGIN_URL) || this.page.url().includes("auth0.com")) {
    assert.ok(!this.page.url().includes("screen_hint=signup"));
    return;
  }
  await this.page.waitForURL(
    (url) =>
      (url.href.includes(AUTH0_LOGIN_URL) || url.hostname.includes("auth0.com")) &&
      !url.href.includes("screen_hint=signup"),
    { timeout: 15000 }
  );
  assert.ok(this.page.url().includes(AUTH0_LOGIN_URL) || this.page.url().includes("auth0.com"));
});

Given("que me logueé exitosamente en Auth0 como cliente", async function (this: CustomWorld) {
  await this.setSession("consumer", {
    id: "mock-001",
    email: registeredEmail || "andy@pro.com",
    firstName: registeredFirstName || "Andres",
    lastName: registeredLastName || "Colina",
    isOnboarded: true,
  });
});

Given("que me logueé exitosamente en Auth0 como prestador", async function (this: CustomWorld) {
  await this.setSession("provider", {
    id: "mock-002",
    email: registeredEmail || "andy@pro.com",
    firstName: registeredFirstName || "Andres",
    lastName: registeredLastName || "Colina",
    isOnboarded: true,
  });
});

When("entro al home de clientes", async function (this: CustomWorld) {
  await this.page.goto(CONSUMER_URL);
});

Given("la API devuelve mi perfil completo de consumidor sin foto", async function (this: CustomWorld) {
  await this.stubGet(
    "/me",
    aCurrentUser("consumer", {
      id: 1,
      name: registeredFirstName || "Andres",
      surname: registeredLastName || "Colina",
      email: registeredEmail || "andy@pro.com",
      profile_photo: null,
    })
  );
  await this.stubGet("/categories", []);
  await this.stubGet("/service-proposals", []);
});

Given("la API devuelve mi perfil completo de consumidor con foto", async function (this: CustomWorld) {
  await this.stubGet(
    "/me",
    aCurrentUser("consumer", {
      id: 1,
      name: registeredFirstName || "Andres",
      surname: registeredLastName || "Colina",
      email: registeredEmail || "andy@pro.com",
      profile_photo: {
        original_name: "avatar.png",
        url: "https://example.com/mock-avatar.png",
      },
    })
  );
  await this.stubGet("/categories", []);
  await this.stubGet("/service-proposals", []);
});

Given(
  "la API devuelve mi perfil completo de prestador con rubro {string}",
  async function (this: CustomWorld, categoryName: string) {
    await this.stubGet(
      "/me",
      aCurrentUser("provider", {
        id: 2,
        name: registeredFirstName || "Andres",
        surname: registeredLastName || "Colina",
        email: registeredEmail || "andy@pro.com",
        profile_photo: {
          original_name: "avatar.png",
          url: "https://example.com/mock-avatar.png",
        },
        category: {
          id: 1,
          name: categoryName,
        },
      })
    );
    await this.stubGet("/job-requests", []);
    await this.stubGet("/service-proposals", []);
  }
);

Then("veo mi foto de perfil cargada en el encabezado", async function (this: CustomWorld) {
  const headerAvatar = this.page.locator('header img[data-testid="header-profile-photo"]').first();
  await headerAvatar.waitFor({ state: "attached", timeout: 5000 });
  assert.ok(await headerAvatar.isVisible(), "La foto de perfil no es visible en el encabezado.");
});

Then("el sistema cargó la información de mi rubro", async function (this: CustomWorld) {
  const categoryEl = this.page
    .locator("aside, header")
    .getByText("Plomería")
    .first()
    .or(this.page.locator('[data-testid="provider-category"]').first());
  await categoryEl.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await categoryEl.isVisible(), "El rubro del prestador no se visualiza en la UI.");
});
