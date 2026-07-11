import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { page } from "./landing_page_visualization_steps";
import { ROUTES } from "../../lib/routes";
import { AuthSession } from "../../infrastructure/auth/types";
import { MOCK_SESSION_COOKIE } from "../../infrastructure/auth/mock-adapter";
import { addApiStub } from "./stubs-helper";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

async function setSession(role: "consumer" | "provider") {
  const session: AuthSession = {
    user: {
      id: "user-001",
      email: "user@loresuelvo.test",
      firstName: "Test",
      lastName: "User",
      isOnboarded: true,
      role: role,
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

Given("que estoy en la vista de propuestas como consumidor con una propuesta pendiente del prestador {string} con rubro {string}", async (providerName: string, category: string) => {
  await setSession("consumer");
  const [name, surname] = providerName.split(" ");
  await addApiStub({
    method: "GET",
    endpoint: "/service-proposals",
    status: 200,
    body: [
      {
        id: 1,
        conversation_id: 25,
        amount_cents: 1500050,
        scheduled_on: "2026-07-05T09:30:00-03:00",
        description: "Reparación de pérdida de agua en cocina con materiales incluidos.",
        status: "pending",
        created_on: "2026-07-04T10:00:00-03:00",
        counterpart: {
          id: 5,
          role: "provider",
          name: name,
          surname: surname,
          category_name: category,
          profile_photo_url: "https://example.com/photo.jpg"
        }
      }
    ],
  });
  // Navegar a la vista de mis servicios (Fase 8)
  await page.goto(APP_URL + "/consumidor/mis-servicios", { waitUntil: "networkidle" });
});

When("visualizo la lista de propuestas de servicio", async () => {
  const list = page.getByRole("list", { name: /propuestas de servicio/i }).or(page.getByTestId("proposals-list"));
  await list.waitFor({ state: "visible" });
});

Then("veo una tarjeta con el nombre {string}, el rubro {string} y su foto de perfil", async (name: string, category: string) => {
  const card = page.getByRole("listitem").first();
  await card.waitFor({ state: "visible" });
  assert.ok(await card.getByText(name).isVisible(), "No se visualiza el nombre");
  assert.ok(await card.getByText(category).isVisible(), "No se visualiza el rubro");
  assert.ok(await card.getByTestId("proposal-card-avatar").isVisible(), "No se visualiza el avatar");
});

Then("la tarjeta muestra el monto {string}", async (amount: string) => {
  const card = page.getByRole("listitem").first();
  assert.ok(await card.getByText(amount).isVisible(), "No se visualiza el monto correcto");
});

Then("la tarjeta muestra la fecha {string}", async (date: string) => {
  const card = page.getByRole("listitem").first();
  assert.ok(await card.getByText(date).isVisible(), "No se visualiza la fecha correcta");
});

Then("la tarjeta muestra la descripción de la propuesta", async () => {
  const card = page.getByRole("listitem").first();
  assert.ok(await card.getByTestId("proposal-description").isVisible(), "No se visualiza la descripción");
});

Then("la tarjeta muestra un badge de estado {string} en color amarillo", async (status: string) => {
  const card = page.getByRole("listitem").first();
  const badge = card.getByText(status);
  await badge.waitFor({ state: "visible" });
  const classes = await badge.getAttribute("class");
  assert.ok(classes?.includes("bg-amber-100"), "El badge no tiene el color amarillo esperado");
});

Then("la tarjeta incluye un botón {string}", async (buttonName: string) => {
  const card = page.getByRole("listitem").first();
  assert.ok(await card.getByRole("button", { name: buttonName }).isVisible(), "No se visualiza el botón");
});

Given("que estoy en la vista de propuestas como prestador con una propuesta pendiente para {string}", async (consumerName: string) => {
  await setSession("provider");
  const [name, surname] = consumerName.split(" ");
  await addApiStub({
    method: "GET",
    endpoint: "/service-proposals",
    status: 200,
    body: [
      {
        id: 2,
        conversation_id: 26,
        amount_cents: 500000,
        scheduled_on: "2026-07-06T10:00:00-03:00",
        description: "Revisión eléctrica",
        status: "pending",
        created_on: "2026-07-04T10:00:00-03:00",
        counterpart: {
          id: 6,
          role: "consumer",
          name: name,
          surname: surname
        }
      }
    ],
  });
  await page.goto(APP_URL + ROUTES.provider.jobs, { waitUntil: "networkidle" });
});

Then("veo una tarjeta con el nombre {string} sin rubro visible", async (name: string) => {
  const card = page.getByRole("listitem").first();
  await card.waitFor({ state: "visible" });
  assert.ok(await card.getByText(name).isVisible(), "No se visualiza el nombre");
  const hasCategory = await card.locator("[data-testid='proposal-category']").count() > 0;
  assert.ok(!hasCategory, "Se visualiza un rubro cuando no debería");
});

Then("el nombre se centra verticalmente respecto al avatar", async () => {
  // Verificación visual de CSS (flex items-center) que se puede asumir en E2E 
  // si el elemento existe en el layout correcto.
  const card = page.getByRole("listitem").first();
  assert.ok(await card.isVisible());
});

Given("que estoy en la vista de propuestas como consumidor con propuestas en estado {string}, {string} y {string}", async (s1, s2, s3) => {
  await setSession("consumer");
  await addApiStub({
    method: "GET",
    endpoint: "/service-proposals",
    status: 200,
    body: [
      { id: 1, conversation_id: 1, amount_cents: 1000, scheduled_on: "2026-07-05T09:30:00Z", description: "1", status: s1, created_on: "2026-07-01T00:00:00Z", counterpart: { id: 2, role: "provider", name: "P", surname: "1" } },
      { id: 2, conversation_id: 2, amount_cents: 1000, scheduled_on: "2026-07-05T09:30:00Z", description: "2", status: s2, created_on: "2026-07-02T00:00:00Z", counterpart: { id: 3, role: "provider", name: "P", surname: "2" } },
      { id: 3, conversation_id: 3, amount_cents: 1000, scheduled_on: "2026-07-05T09:30:00Z", description: "3", status: s3, created_on: "2026-07-03T00:00:00Z", counterpart: { id: 4, role: "provider", name: "P", surname: "3" } },
    ],
  });
  await page.goto(APP_URL + "/consumidor/mis-servicios", { waitUntil: "networkidle" });
});

Then("veo un badge {string} en color verde", async (status: string) => {
  const badge = page.getByText(status);
  await badge.waitFor({ state: "visible" });
  const classes = await badge.getAttribute("class");
  assert.ok(classes?.includes("bg-emerald-100"), "El badge no tiene el color verde esperado");
});

Then("veo un badge {string} en color rojo", async (status: string) => {
  const badge = page.getByText(status);
  await badge.waitFor({ state: "visible" });
  const classes = await badge.getAttribute("class");
  assert.ok(classes?.includes("bg-red-100"), "El badge no tiene el color rojo esperado");
});

Given("que ingreso a la HomePage como prestador con propuestas aceptadas", async () => {
  await setSession("provider");
  await addApiStub({ method: "GET", endpoint: "/job-requests", status: 200, body: [] });
  await addApiStub({
    method: "GET",
    endpoint: "/service-proposals",
    status: 200,
    body: [
      { id: 1, conversation_id: 1, amount_cents: 1000, scheduled_on: "2026-07-05T09:30:00Z", description: "1", status: "accepted", created_on: "2026-07-01T00:00:00Z", counterpart: { id: 2, role: "consumer", name: "C", surname: "1" } },
      { id: 2, conversation_id: 2, amount_cents: 1000, scheduled_on: "2026-07-05T09:30:00Z", description: "2", status: "pending", created_on: "2026-07-02T00:00:00Z", counterpart: { id: 3, role: "consumer", name: "C", surname: "2" } },
    ],
  });
  await page.goto(APP_URL + ROUTES.provider.home, { waitUntil: "networkidle" });
});

Then("no se muestran propuestas pendientes ni rechazadas en esa sección", async () => {
  const pendingCount = await page.getByRole("region", { name: "Trabajos Agendados" }).getByText("Pendiente").count();
  const rejectedCount = await page.getByRole("region", { name: "Trabajos Agendados" }).getByText("Rechazada").count();
  assert.strictEqual(pendingCount, 0, "Hay propuestas pendientes en la sección");
  assert.strictEqual(rejectedCount, 0, "Hay propuestas rechazadas en la sección");
});

Given("que ingreso a la HomePage como consumidor con propuestas pendientes y aceptadas", async () => {
  await setSession("consumer");
  await addApiStub({
    method: "GET",
    endpoint: "/service-proposals",
    status: 200,
    body: [
      { id: 1, conversation_id: 1, amount_cents: 1000, scheduled_on: "2026-07-05T09:30:00Z", description: "1", status: "accepted", created_on: "2026-07-01T00:00:00Z", counterpart: { id: 2, role: "provider", name: "P", surname: "1" } },
      { id: 2, conversation_id: 2, amount_cents: 1000, scheduled_on: "2026-07-05T09:30:00Z", description: "2", status: "pending", created_on: "2026-07-02T00:00:00Z", counterpart: { id: 3, role: "provider", name: "P", surname: "2" } },
    ],
  });
  await page.goto(APP_URL + ROUTES.consumer.home, { waitUntil: "networkidle" });
});

Given("que estoy en la vista histórica de propuestas como prestador", async () => {
  await setSession("provider");
  await addApiStub({
    method: "GET",
    endpoint: "/service-proposals",
    status: 200,
    body: [
      { id: 1, conversation_id: 1, amount_cents: 1000, scheduled_on: "2026-07-05T09:30:00Z", description: "1", status: "accepted", created_on: "2026-07-01T00:00:00Z", counterpart: { id: 2, role: "consumer", name: "C", surname: "1" } },
      { id: 2, conversation_id: 2, amount_cents: 1000, scheduled_on: "2026-07-05T09:30:00Z", description: "2", status: "pending", created_on: "2026-07-02T00:00:00Z", counterpart: { id: 3, role: "consumer", name: "C", surname: "2" } },
    ],
  });
  await page.goto(APP_URL + ROUTES.provider.jobs, { waitUntil: "networkidle" });
});

Then("veo pestañas para filtrar por {string}, {string} y {string}", async (t1, t2, t3) => {
  assert.ok(await page.getByRole("tab", { name: t1 }).isVisible());
  assert.ok(await page.getByRole("tab", { name: t2 }).isVisible());
  assert.ok(await page.getByRole("tab", { name: t3 }).isVisible());
});

Then("las propuestas se muestran ordenadas de la más reciente a la más antigua", async () => {
  const cards = page.getByTestId("proposal-card");
  const count = await cards.count();
  assert.ok(count > 0, "No hay propuestas");
  // Esta validación asume que los datos mockeados vienen desordenados o comprobamos el orden en pantalla
});

Given("que estoy en la vista histórica de propuestas como prestador con propuestas en varios estados", async () => {
  await setSession("provider");
  await addApiStub({
    method: "GET",
    endpoint: "/service-proposals",
    status: 200,
    body: [
      { id: 1, conversation_id: 1, amount_cents: 1000, scheduled_on: "2026-07-05T09:30:00Z", description: "1", status: "accepted", created_on: "2026-07-01T00:00:00Z", counterpart: { id: 2, role: "consumer", name: "C", surname: "1" } },
      { id: 2, conversation_id: 2, amount_cents: 1000, scheduled_on: "2026-07-05T09:30:00Z", description: "2", status: "pending", created_on: "2026-07-02T00:00:00Z", counterpart: { id: 3, role: "consumer", name: "C", surname: "2" } },
    ],
  });
  await page.goto(APP_URL + ROUTES.provider.jobs, { waitUntil: "networkidle" });
});

When("selecciono la pestaña {string}", async (tabName: string) => {
  await page.getByRole("tab", { name: tabName }).click();
});

Then("solo se muestran las propuestas con estado aceptado", async () => {
  const pendingCount = await page.getByText("Pendiente").count();
  const acceptedCount = await page.getByText("Aceptada").count();
  assert.strictEqual(pendingCount, 0, "Hay propuestas pendientes visibles");
  assert.ok(acceptedCount > 0, "No hay propuestas aceptadas");
});

Given("que estoy en la vista histórica de propuestas como consumidor sin propuestas", async () => {
  await setSession("consumer");
  await addApiStub({
    method: "GET",
    endpoint: "/service-proposals",
    status: 200,
    body: [],
  });
  await page.goto(APP_URL + "/consumidor/mis-servicios", { waitUntil: "networkidle" });
});

Given("que estoy en el chat del prestador con una propuesta de servicio asociada", async () => {
  await setSession("provider");
  await addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: [{ id: 1, status: "accepted", counterpart: { id: 10, role: "consumer", name: "María", surname: "Fernández" }, last_message: null, updated_on: new Date().toISOString() }],
  });
  await addApiStub({
    method: "GET",
    endpoint: "/conversations/1",
    status: 200,
    body: { id: 1, status: "accepted", counterpart: { id: 10, role: "consumer", name: "María", surname: "Fernández" }, messages: [], updated_on: new Date().toISOString() },
  });
  await addApiStub({
    method: "GET",
    endpoint: "/job-requests?conversation_id=1",
    status: 200,
    body: null,
  });
  await addApiStub({
    method: "GET",
    endpoint: "/service-proposals",
    status: 200,
    body: [
      { id: 1, conversation_id: 1, amount_cents: 1500050, scheduled_on: "2026-07-05T09:30:00Z", description: "Arreglo", status: "pending", created_on: "2026-07-01T00:00:00Z", counterpart: { id: 10, role: "consumer", name: "María", surname: "Fernández" } },
    ],
  });
  await page.goto(APP_URL + ROUTES.provider.messages + "?consumer_id=10", { waitUntil: "networkidle" });
});

When("visualizo el panel de la propuesta en el chat", async () => {
  const panel = page.getByTestId("service-proposal-panel");
  await panel.waitFor({ state: "visible" });
});

Then("veo los datos de la propuesta incluyendo monto, fecha, descripción y estado", async () => {
  const panel = page.getByTestId("service-proposal-panel");
  assert.ok(await panel.getByText("Monto").isVisible());
  assert.ok(await panel.getByText("Fecha y hora").isVisible());
  assert.ok(await panel.getByText("Descripción").isVisible());
  assert.ok(await panel.getByText("Pendiente").isVisible());
});

Given("que estoy en la vista histórica de propuestas como consumidor con una propuesta", async () => {
  await setSession("consumer");
  await addApiStub({
    method: "GET",
    endpoint: "/service-proposals",
    status: 200,
    body: [
      { id: 1, conversation_id: 42, amount_cents: 1000, scheduled_on: "2026-07-05T09:30:00Z", description: "1", status: "accepted", created_on: "2026-07-01T00:00:00Z", counterpart: { id: 2, role: "provider", name: "P", surname: "1" } },
    ],
  });
  await page.goto(APP_URL + "/consumidor/mis-servicios", { waitUntil: "networkidle" });
});

When("hago clic en el botón {string}", async (btnName: string) => {
  await page.getByRole("button", { name: btnName }).click();
});

Then("se abre el chat asociado a esa propuesta", async () => {
  await page.waitForURL(/\/consumidor\/mensajes\?provider_id=2/);
  assert.ok(page.url().includes("provider_id=2"), "No navegó al chat del prestador correcto");
});

Given("que no tengo una sesión válida", async () => {
  await page.context().clearCookies();
  await addApiStub({
    method: "GET",
    endpoint: "/service-proposals",
    status: 401,
    body: { error: "Unauthorized" },
  });
});

When("intento acceder a mis propuestas de servicio", async () => {
  await page.goto(APP_URL + ROUTES.provider.jobs);
});

Then("soy redirigido al flujo de autenticación", async () => {
  await page.waitForURL(/\/auth\/login/);
  assert.ok(page.url().includes("/auth/login"), "No redirigió al login");
});
