import { Given, When, Then } from "@cucumber/cucumber";
import { page } from "./landing_page_visualization_steps";
import { AuthSession } from "../../lib/auth/types";
import { MOCK_SESSION_COOKIE } from "../../lib/auth/mock-adapter";
import assert from "assert";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const CONSUMER_URL = APP_URL + "/consumer/home";
const AUTH0_SIGNUP_URL = "/auth/login?screen_hint=signup";

/**
 * Setea una sesión mockeada en el browser mediante una cookie.
 * DevAuthAdapter la detecta automáticamente y devuelve la sesión del mock.
 * No requiere variables de entorno adicionales.
 */
async function setMockSession(session: AuthSession) {
  await page.context().addCookies([{
    name: MOCK_SESSION_COOKIE,
    value: encodeURIComponent(JSON.stringify(session)),
    url: APP_URL,
    path: "/",
  }]);
}

async function clearMockSession() {
  await page.context().clearCookies({ name: MOCK_SESSION_COOKIE, domain: "localhost" });
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

When('entro al home de consumidores', async () => {
  await page.goto(CONSUMER_URL);
});

Then('soy redirigido al portal de autenticación de Auth0', async () => {
  const request = await page.waitForRequest(
    req => req.url().includes(AUTH0_SIGNUP_URL),
    { timeout: 5000 }
  );
  assert.ok(request, `No se realizó ninguna navegación hacia "${AUTH0_SIGNUP_URL}"`);
});


Given('que me he registrado exitosamente en Auth0 con nombre {string}, apellido {string} y email {string}',
  async (nombre: string, apellido: string, email: string) => {
    await setMockSession({
      user: { id: "mock-001", email, firstName: nombre, lastName: apellido },
      accessToken: "mock-access-token",
    });
  }
);

Then('veo mi nombre {string} en el encabezado', async (name: string) => {
  const header = page.locator('header');
  await header.waitFor({ state: "visible" });
  const text = await header.innerText();
  assert.ok(text.includes(name), `Name "${name}" not found in header`);
});

Given('que estoy autenticado', async () => {
  await setMockSession({
    user: { id: "mock-001", email: "andres@loresuelvo.com", firstName: "Andres", lastName: "Colina" },
    accessToken: "mock-access-token",
  });
});

Then('veo el botón de {string}', async (buttonName: string) => {
  const button = page.getByRole('button', { name: buttonName })
                     .or(page.getByRole('link', { name: buttonName })).first();
  await button.waitFor({ state: "visible" });
  assert.ok(await button.isVisible(), `There is no button or link "${buttonName}"`);
});

Then('no veo el botón de {string}', async (buttonName: string) => {
  const button = page.getByRole('button', { name: buttonName })
                     .or(page.getByRole('link', { name: buttonName })).first();
  await page.waitForTimeout(500);
  assert.ok(!(await button.isVisible()), `Button "${buttonName}" is visible but shouldn't be`);
});

Given('que no me puedo registrar exitosamente en Auth0', async () => {
  await clearMockSession();
});

Then('veo un error de permisos invalidos', async () => {
  const currentUrl = page.url();
  const isOnProtectedRoute = currentUrl.includes("/consumer/home");
  assert.ok(
    !isOnProtectedRoute,
    `Se esperaba ser redirigido fuera de /consumer/home pero la URL actual es: ${currentUrl}`
  );
});
