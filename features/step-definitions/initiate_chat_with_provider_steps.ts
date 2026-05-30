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
  const messageButtons = page.getByRole("link", { name: /Contactar/i });
  const count = await messageButtons.count();

  assert.ok(count > 0, "No se encontró ningún botón Contactar en los resultados de búsqueda");

  for (let i = 0; i < count; i++) {
    assert.ok(await messageButtons.nth(i).isVisible(), `El botón Contactar ${i + 1} no es visible`);
  }
});

Given("que quiero iniciar chat con un prestador desde los resultados de búsqueda", async () => {
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
          description: "Especialista en instalaciones hidrosanitarias.",
          category_id: 1,
        },
      ],
    });
  }

  await page.goto(APP_URL + ROUTES.consumer.buscar + "?category_id=1");
  await page.waitForLoadState("networkidle");
});

When("hago clic en el botón {string} del prestador", async (buttonName: string) => {
  const button = page.getByRole("link", { name: buttonName }).first();
  await button.waitFor({ state: "visible" });
  await button.click();
});

Then("soy redirigido a la pantalla de mensajes con el prestador seleccionado", async () => {
  await page.waitForURL(`**${ROUTES.consumer.messages}**`);
  assert.ok(page.url().includes(ROUTES.consumer.messages), `Expected URL to contain ${ROUTES.consumer.messages} but got ${page.url()}`);
});

Given("que ya envié un mensaje a un prestador", async () => {
  await setConsumerSession();

  if (!await hasApiStub("GET", "/categories")) {
    await addApiStub({
      method: "GET",
      endpoint: "/categories",
      status: 200,
      body: [
        { id: 1, name: "Plomería", description: "Servicios de plomería" },
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
          description: "Especialista en instalaciones hidrosanitarias.",
          category_id: 1,
        },
      ],
    });
  }

  await page.goto(APP_URL + ROUTES.consumer.messages + "?provider_id=provider-001");
  await page.waitForLoadState("networkidle");
});

When("accedo a la sección de mensajes", async () => {
  await page.goto(APP_URL + ROUTES.consumer.messages + "?provider_id=provider-001");
  await page.waitForLoadState("networkidle");
});

Then("visualizo al prestador como contacto en mi lista", async () => {
  const contactName = page.getByText("Carlos Méndez").first();
  await contactName.waitFor({ state: "visible" });
  assert.ok(await contactName.isVisible(), "El prestador Carlos Méndez no aparece como contacto");
});

Given("que inicié un chat con un prestador", async () => {
  await setConsumerSession();

  if (!await hasApiStub("GET", "/categories")) {
    await addApiStub({
      method: "GET",
      endpoint: "/categories",
      status: 200,
      body: [
        { id: 1, name: "Plomería", description: "Servicios de plomería" },
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
          description: "Especialista en instalaciones hidrosanitarias.",
          category_id: 1,
        },
      ],
    });
  }

  await page.goto(APP_URL + ROUTES.consumer.messages + "?provider_id=provider-001");
  await page.waitForLoadState("networkidle");
});

Given("el prestador aún no aceptó la conversación", async () => {
});

When("visualizo el estado del contacto", async () => {
  await page.waitForLoadState("networkidle");
});

Then("veo una notificación indicando que el prestador todavía no aceptó mi solicitud", async () => {
  const notification = page.getByText("Solicitud de contacto enviada. El prestador aún no aceptó la conversación.");
  await notification.waitFor({ state: "visible" });
  assert.ok(await notification.isVisible(), "No se visualiza la notificación de solicitud pendiente");
});

Given("que inicié un chat con un prestador y no fue aceptado", async () => {
  await setConsumerSession();

  if (!await hasApiStub("GET", "/categories")) {
    await addApiStub({
      method: "GET",
      endpoint: "/categories",
      status: 200,
      body: [
        { id: 1, name: "Plomería", description: "Servicios de plomería" },
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
          description: "Especialista en instalaciones hidrosanitarias.",
          category_id: 1,
        },
      ],
    });
  }

  await page.goto(APP_URL + ROUTES.consumer.messages + "?provider_id=provider-001");
  await page.waitForLoadState("networkidle");
});

When("escribo un nuevo mensaje", async () => {
  const input = page.getByPlaceholder("Escribe un mensaje...");
  await input.waitFor({ state: "visible" });
  await input.fill("Hola, me gustaría contratarte para el trabajo");
});

Then("puedo enviar mensajes adicionales al prestador sin restricciones", async () => {
  const input = page.getByPlaceholder("Escribe un mensaje...");
  await input.waitFor({ state: "visible" });
  
  const inputValue = await input.inputValue();
  assert.ok(inputValue.length > 0, "El campo de mensaje está vacío");
  
  const sendButton = page.locator("button[type='button']").filter({ has: page.locator("svg") }).last();
  await sendButton.waitFor({ state: "visible" });
  const isDisabled = await sendButton.getAttribute("disabled");
  assert.ok(isDisabled === null, "El botón de enviar está deshabilitado");
});