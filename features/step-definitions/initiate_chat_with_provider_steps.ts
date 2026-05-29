import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { page } from "./landing_page_visualization_steps";
import { ROUTES } from "../../lib/routes";
import { AuthSession } from "../../lib/auth/types";
import { MOCK_SESSION_COOKIE } from "../../lib/auth/mock-adapter";
import { addApiStub, hasApiStub } from "./stubs-helper";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

async function setConsumerSession(email: string = "consumer@test.com", firstName: string = "Andres") {
  const session: AuthSession = {
    user: {
      id: "consumer-001",
      email,
      firstName,
      lastName: "Test",
      isOnboarded: true,
      role: "consumer",
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

Given("que estoy buscando prestadores por rubro", async () => {
  await setConsumerSession();

  if (!await hasApiStub("GET", "/categories")) {
    await addApiStub({
      method: "GET",
      endpoint: "/categories",
      status: 200,
      body: [
        { id: 1, name: "Plomería", description: "Servicios de plomería" },
        { id: 2, name: "Electricidad", description: "Servicios eléctricos" },
      ],
    });
  }

  if (!await hasApiStub("GET", "/providers?category_id=1")) {
    await addApiStub({
      method: "GET",
      endpoint: "/providers?category_id=1",
      status: 200,
      body: [
        {
          id: "provider-001",
          name: "Carlos",
          surname: "Méndez",
          rating: 4.8,
          reviews: 124,
          jobs: 452,
          description: "Especialista en instalaciones hidrosanitarias de alta complejidad y mantenimiento residencial.",
          category_id: 1,
        },
        {
          id: "provider-002",
          name: "María",
          surname: "González",
          rating: 4.6,
          reviews: 89,
          jobs: 234,
          description: "Electricista con más de 10 años de experiencia en instalaciones residenciales y comerciales.",
          category_id: 1,
        },
      ],
    });
  }

  await page.goto(APP_URL + ROUTES.consumer.buscar + "?category_id=1");
});

When("visualizo la lista de resultados", async () => {
  await page.waitForLoadState("networkidle");
});

Then("veo un logo de mensaje para contactarlos", async () => {
  const messageButtons = page.getByRole("button", { name: /Enviar mensaje a/i });
  const count = await messageButtons.count();
  
  assert.ok(count > 0, "No se encontró ningún logo de mensaje en los resultados de búsqueda");
  
  for (let i = 0; i < count; i++) {
    assert.ok(await messageButtons.nth(i).isVisible(), `El logo de mensaje ${i + 1} no es visible`);
  }
});