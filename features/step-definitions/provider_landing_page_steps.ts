import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { page } from "./landing_page_visualization_steps";
import { ROUTES } from "../../lib/routes";
import { AuthSession } from "../../lib/auth/types";
import { MOCK_SESSION_COOKIE } from "../../lib/auth/mock-adapter";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

async function setProviderSession() {
  const session: AuthSession = {
    user: {
      id: "provider-home-001",
      email: "prestador@loresuelvo.test",
      firstName: "Paula",
      lastName: "Rios",
      isOnboarded: true,
      role: "provider",
    },
    accessToken: "mock-access-token",
  };

  await page.context().addCookies([{
    name: MOCK_SESSION_COOKIE,
    value: encodeURIComponent(JSON.stringify(session)),
    domain: "localhost",
    path: "/",
  }]);
}

Given("que ingreso a la HomePage como prestador", async () => {
  await setProviderSession();
  await page.goto(APP_URL + ROUTES.provider.home);
});

When("se carga la pantalla principal", async () => {
  await page.waitForLoadState("networkidle");
});

Then("visualizo una barra lateral de navegación", async () => {
  const sidebar = page.getByRole("complementary", {
    name: "Panel lateral del prestador",
  });
  await sidebar.waitFor({ state: "visible" });
  assert.ok(await sidebar.isVisible(), "No se visualiza la barra lateral de navegación");
});

Then("veo la opción {string}", async (optionName: string) => {
  const option = page
    .getByRole("navigation", { name: "Navegación del prestador" })
    .getByRole("link", { name: optionName });
  await option.waitFor({ state: "visible" });
  assert.ok(await option.isVisible(), `No se visualiza la opción "${optionName}"`);
});
