import { Given, Then, When } from "@cucumber/cucumber";
import { page } from "./landing_page_visualization_steps";
import { AuthSession } from "../../lib/auth/types";
import { MOCK_SESSION_COOKIE } from "../../lib/auth/mock-adapter";
import assert from "assert";
import { ROUTES } from "../../lib/routes";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const AUTH0_LOGIN_URL = ROUTES.auth.login;
const CONSUMER_URL = APP_URL + ROUTES.consumer.home;

let registeredEmail = "";
let registeredFirstName = "";
let registeredLastName = "";

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

Given('que no inicié sesión en Auth0', async () => {
  await clearMockSession();
});

Given('previamente me registre exitosamente con el mail {string}, nombre {string} y apellido {string}',
  async (email: string, firstName: string, lastName: string) => {
    registeredEmail = email;
    registeredFirstName = firstName;
    registeredLastName = lastName;
  }
);

Then('soy redirigido al portal de autenticación de Auth0 para iniciar sesión', async () => {
  const request = await page.waitForRequest(
    req => req.url().includes(AUTH0_LOGIN_URL) && !req.url().includes("screen_hint=signup"),
    { timeout: 5000 }
  );
  assert.ok(request, `No navigation was made towards "${AUTH0_LOGIN_URL}"`);
});

Given('que me logueé exitosamente en Auth0 como cliente', async () => {
  await setMockSession({
    user: {
      id: "mock-001",
      email: registeredEmail || "andy@pro.com",
      firstName: registeredFirstName || "Andres",
      lastName: registeredLastName || "Colina",
      isOnboarded: true,
      role: "consumer"
    },
    accessToken: "mock-access-token",
  });
});

Given('que me logueé exitosamente en Auth0 como prestador', async () => {
  await setMockSession({
    user: {
      id: "mock-002",
      email: registeredEmail || "andy@pro.com",
      firstName: registeredFirstName || "Andres",
      lastName: registeredLastName || "Colina",
      isOnboarded: true,
      role: "provider"
    },
    accessToken: "mock-access-token",
  });
});

When('entro al home de clientes', async () => {
  await page.goto(CONSUMER_URL);
});
