import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld, APP_URL, visibleTimeout, attachedTimeout, waitTimeout, attachedState } from "../support/world";
import assert from "assert";
import { ROUTES } from "../../lib/routes";
import { aConsumer, aProvider, aCategory } from "../support/factories";

const CONSUMER_URL = APP_URL + "/consumidor/home";
const AUTH0_SIGNUP_URL = "/auth/login?screen_hint=signup";

let selectedRole: "consumer" | "provider" | null = null;
export const setSelectedRole = (role: "consumer" | "provider") => {
  selectedRole = role;
};

Given("que estoy en la página de inicio", async function (this: CustomWorld) {
  await this.page.goto(APP_URL);
});

When("hago clic en el botón {string}", async function (this: CustomWorld, buttonName: string) {
  const button = this.page
    .getByRole("button", { name: buttonName })
    .or(this.page.getByRole("link", { name: buttonName }))
    .first();
  await button.waitFor();
  if (buttonName === "Ver conversación") {
    const initialUrl = this.page.url();
    for (let i = 0; i < 5; i++) {
      await button.click();
      await this.page.waitForTimeout(300);
      if (this.page.url() !== initialUrl) break;
    }
  } else {
    await button.click();
  }
});

When("finalizo el registro", async function (this: CustomWorld) {
  const endpoint = selectedRole === "provider" ? "/providers" : "/consumers";
  const firstName = (this as any).registeredFirstName || (selectedRole === "provider" ? "Carlos" : "Andres");
  const lastName = (this as any).registeredLastName || (selectedRole === "provider" ? "López" : "Colina");

  if (!(await this.hasApiStub("POST", endpoint))) {
    const user = selectedRole === "provider" 
      ? aProvider({ name: firstName, surname: lastName }) 
      : aConsumer({ name: firstName, surname: lastName });
    await this.stubPost(endpoint, 201, user);
  }

  await this.stubGet("/me", {
    id: "mock-001",
    name: firstName,
    surname: lastName,
    email: "andy@pro.com",
    role: selectedRole === "provider" ? "provider" : "consumer",
    category: selectedRole === "provider" ? { id: 1, name: "Plomería" } : undefined,
    profile_photo: null,
  });

  const finalizeOptions = { name: "Finalizar Registro" };
  const button = this.page.getByRole("button", finalizeOptions).first();
  await button.waitFor();
  await button.click();
});

When("entro al home de consumidores", async function (this: CustomWorld) {
  await this.page.goto(CONSUMER_URL);
});

Then("soy redirigido al portal de autenticación de Auth0", async function (this: CustomWorld) {
  const request = await this.page.waitForRequest(
    (req) => req.url().includes(AUTH0_SIGNUP_URL),
    waitTimeout
  );
  assert.ok(request, `No navigation was made towards "${AUTH0_SIGNUP_URL}"`);
});

Given(
  "que me registré exitosamente en Auth0 con email {string}",
  async function (this: CustomWorld, email: string) {
    await this.setSession("consumer", {
      id: "mock-001",
      email,
      firstName: "",
      lastName: "",
      isOnboarded: false,
    });
    await this.stubGet("/categories", [
      aCategory({ id: 1, name: "Plomería" }),
      aCategory({ id: 2, name: "Electricista" }),
    ]);
  }
);

Given(
  "complete mi nombre {string} y apellido {string} en la pagina de registro de LoResuelvo",
  async function (this: CustomWorld, firstName: string, lastName: string) {
    await this.setSession("consumer", {
      id: "mock-001",
      email: "andy@pro.com",
      firstName,
      lastName,
      isOnboarded: true,
    });
  }
);

Given("elegí la opción de consumidor en la pagina de registro", async function (this: CustomWorld) {
  selectedRole = "consumer";
  await this.page.goto(APP_URL + ROUTES.onboarding);
  const consumerButton = this.page.getByText("Soy Cliente").first();
  await consumerButton.click();
  const continueButton = this.page.getByText("Continuar").first();
  await continueButton.click();
});

Then("veo mi nombre {string} en el encabezado", async function (this: CustomWorld, name: string) {
  const header = this.page.locator("header");
  await header.waitFor();

  let text = await header.innerText();
  if (!text.includes(name)) {
    const initials = name.charAt(0).toUpperCase();
    const avatarButton = header.getByRole("button", { name: initials }).or(header.locator("button")).first();
    await avatarButton.waitFor();
    await avatarButton.click();
    text = await header.innerText();
  }
  assert.ok(text.includes(name), `Name "${name}" not found in header`);
});

Then("veo el botón de {string}", async function (this: CustomWorld, buttonName: string) {
  const button = this.page
    .getByRole("button", { name: buttonName })
    .or(this.page.getByRole("link", { name: buttonName }))
    .first();
  await button.waitFor();
  assert.ok(await button.isVisible(), `There is no button or link "${buttonName}"`);
});

Given("que no me registré en Auth0", async function (this: CustomWorld) {
  await this.page.context().clearCookies();
});

Then("soy redirigido a la página de inicio", async function (this: CustomWorld) {
  const currentUrl = this.page.url().replace(/\/$/, "");
  const expectedUrl = APP_URL.replace(/\/$/, "");
  assert.ok(
    currentUrl === expectedUrl,
    `Was expected to be redirected to "${expectedUrl}" but the current URL is: ${this.page.url()}`
  );
});

Given("no completé mis datos en la pagina de registro de LoResuelvo", async function (this: CustomWorld) {
  await this.setSession("consumer", {
    id: "mock-001",
    email: "andy@pro.com",
    firstName: "",
    lastName: "",
    isOnboarded: false,
  });
});

Then("soy redirigido a la página de registro", async function (this: CustomWorld) {
  await this.page.waitForURL(`**${ROUTES.onboarding}`);
  assert.equal(
    this.page.url().endsWith(ROUTES.onboarding),
    true,
    `Was expected to be at ${ROUTES.onboarding} but is at ${this.page.url()}`
  );
});

Then("soy redirigido al home de consumidores", async function (this: CustomWorld) {
  await this.page.waitForURL(CONSUMER_URL);
  const currentUrl = this.page.url().replace(/\/$/, "");
  const expectedUrl = CONSUMER_URL.replace(/\/$/, "");
  assert.ok(
    currentUrl === expectedUrl,
    `Was expected to be redirected to "${expectedUrl}" but the current URL is: ${this.page.url()}`
  );
});

Then("la barra lateral muestra la opción {string}", async function (this: CustomWorld, optionName: string) {
  const navigation = this.page.getByRole("navigation", { name: "Navegación del consumidor" });
  await navigation.waitFor();
  const option = navigation.getByRole("link", { name: optionName });
  await option.waitFor();
  assert.ok(await option.isVisible(), `La opción "${optionName}" no se encontró en la barra lateral`);
});
