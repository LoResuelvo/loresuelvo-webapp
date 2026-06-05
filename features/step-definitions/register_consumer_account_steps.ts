import { Given, When, Then } from "@cucumber/cucumber";
import { page } from "./landing_page_visualization_steps";
import { addApiStub, hasApiStub } from "./stubs-helper";
import { AuthSession } from "../../lib/auth/types";
import { MOCK_SESSION_COOKIE } from "../../lib/auth/mock-adapter";
import assert from "assert";
import { ROUTES } from "../../lib/routes";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const CONSUMER_URL = APP_URL + "/consumidor/home";
const AUTH0_SIGNUP_URL = "/auth/login?screen_hint=signup";

let selectedRole: "consumer" | "provider" | null = null;
export const setSelectedRole = (role: "consumer" | "provider") => { selectedRole = role; };

async function setMockSession(session: AuthSession) {
  await page.context().addCookies([{
    name: MOCK_SESSION_COOKIE,
    value: encodeURIComponent(JSON.stringify(session)),
    domain: "localhost",
    path: "/",
  }]);
}

async function clearMockSession() {
  await page.context().clearCookies();
}

Given('que estoy en la página de inicio', async () => {
  await page.goto(APP_URL);
});

When('hago clic en el botón {string}', async (buttonName: string) => {
  const button = page.getByRole('button', { name: buttonName })
    .or(page.getByRole('link', { name: buttonName })).first();
  await button.waitFor({ state: "visible" });
  await button.click();
});

When('finalizo el registro', async () => {
  const endpoint = selectedRole === "provider" ? "/providers" : "/consumers";

  if (!await hasApiStub("POST", endpoint)) {
    await addApiStub({
      method: "POST",
      endpoint,
      status: 201,
      body: { id: `mock-${selectedRole}-001` },
    });
  }

  const button = page.getByRole('button', { name: 'Finalizar Registro' }).first();
  await button.waitFor({ state: "visible" });
  await button.click();
});




When('entro al home de consumidores', async () => {
  await page.goto(CONSUMER_URL);
});

Then('soy redirigido al portal de autenticación de Auth0', async () => {
  const request = await page.waitForRequest(
    req => req.url().includes(AUTH0_SIGNUP_URL),
    { timeout: 5000 }
  );
  assert.ok(request, `No navigation was made towards "${AUTH0_SIGNUP_URL}"`);
});



Given('que me registré exitosamente en Auth0 con email {string}',
  async (email: string) => {
    await setMockSession({
      user: { id: "mock-001", email, firstName: "", lastName: "", isOnboarded: false },
      accessToken: "mock-access-token",
    });
  }
);


Given('complete mi nombre {string} y apellido {string} en la pagina de registro de LoResuelvo',
  async (firstName: string, lastName: string) => {
    await setMockSession({
      user: { id: "mock-001", email: "andy@pro.com", firstName: firstName, lastName: lastName, isOnboarded: true },
      accessToken: "mock-access-token",
    });
  }
);

Given('elegí la opción de consumidor en la pagina de registro', async () => {
  selectedRole = "consumer";
  await page.goto(APP_URL + ROUTES.onboarding);
  const consumerButton = page.getByText("Soy Cliente").first();
  await consumerButton.click();
  const continueButton = page.getByText("Continuar").first();
  await continueButton.click();
});

Then('veo mi nombre {string} en el encabezado', async (name: string) => {
  const header = page.locator('header');
  await header.waitFor({ state: "visible" });
  
  let text = await header.innerText();
  if (!text.includes(name)) {
    const initials = name.charAt(0).toUpperCase();
    const avatarButton = header.getByRole('button', { name: initials }).or(header.locator('button')).first();
    await avatarButton.waitFor({ state: "visible" });
    await avatarButton.click();
    await page.waitForTimeout(200);
    text = await header.innerText();
  }
  assert.ok(text.includes(name), `Name "${name}" not found in header`);
});

Then('veo el botón de {string}', async (buttonName: string) => {
  const button = page.getByRole('button', { name: buttonName })
    .or(page.getByRole('link', { name: buttonName })).first();
  await button.waitFor({ state: "visible" });
  assert.ok(await button.isVisible(), `There is no button or link "${buttonName}"`);
});

Given('que no me registré en Auth0', async () => {
  await clearMockSession();
});

Then('soy redirigido a la página de inicio', async () => {
  const currentUrl = page.url().replace(/\/$/, "");
  const expectedUrl = APP_URL.replace(/\/$/, "");
  const is_home_page = currentUrl === expectedUrl;
  assert.ok(
    is_home_page,
    `Was expected to be redirected to "${expectedUrl}" but the current URL is: ${page.url()}`
  );
});


Given('no completé mis datos en la pagina de registro de LoResuelvo', async () => {
  await setMockSession({
    user: { id: "mock-001", email: "andy@pro.com", firstName: "", lastName: "", isOnboarded: false },
    accessToken: "mock-access-token",
  });
})

Then('soy redirigido a la página de registro', async () => {
  await page.waitForURL(`**${ROUTES.onboarding}`);
  assert.equal(page.url().endsWith(ROUTES.onboarding), true, `Was expected to be at ${ROUTES.onboarding} but is at ${page.url()}`);
});

Then('soy redirigido al home de consumidores', async () => {
  await page.waitForURL(CONSUMER_URL);
  const currentUrl = page.url().replace(/\/$/, "");
  const expectedUrl = CONSUMER_URL.replace(/\/$/, "");
  assert.ok(
    currentUrl === expectedUrl,
    `Was expected to be redirected to "${expectedUrl}" but the current URL is: ${page.url()}`
  );
});

Then('la barra lateral muestra la opción {string}', async (optionName: string) => {
  const navigation = page.getByRole('navigation', { name: 'Navegación del consumidor' });
  await navigation.waitFor({ state: 'visible' });
  const option = navigation.getByRole('link', { name: optionName });
  await option.waitFor({ state: 'visible' });
  assert.ok(await option.isVisible(), `La opción "${optionName}" no se encontró en la barra lateral`);
});
