import { Given, Then, When } from "@cucumber/cucumber";
import assert from "assert";
import { ROUTES } from "../../lib/routes";
import { aCurrentUser, aProposal, aWorkOrder } from "../support/factories";
import { APP_URL, CustomWorld, visibleTimeout, waitTimeout } from "../support/world";
import { openWorkOrderDetailModal } from "../work-orders/view_work_order_detail_steps";

const PROPOSAL_ID = 42;
const WORK_ORDER_ID = 10;
const CALENDAR_CONSENT_URL = "https://accounts.google.com/o/oauth2/v2/auth?client_id=loresuelvo-test";

async function prepareParticipantOrder(world: CustomWorld, role: "consumer" | "provider"): Promise<void> {
  await world.setSession(role);
  await world.stubGet("/service-proposals", [aProposal(role, { id: PROPOSAL_ID })]);
  const order = aWorkOrder({ id: WORK_ORDER_ID, service_proposal_id: PROPOSAL_ID });
  await world.stubGet(`/work-orders?service_proposal_id=${PROPOSAL_ID}`, order);
  await world.stubGet(`/work-orders/${WORK_ORDER_ID}`, order);
}

Given(/^que soy un participante autenticado con rol (consumidor|prestador)$/, async function (
  this: CustomWorld,
  label: string,
) {
  await prepareParticipantOrder(this, label === "prestador" ? "provider" : "consumer");
});

Given("que mi conexión de Google Calendar requiere atención", async function (this: CustomWorld) {
  await prepareParticipantOrder(this, "consumer");
  await this.stubGet("/me", aCurrentUser("consumer", { calendar_connection_status: "action_required" }));
});

Given("estoy viendo el detalle de una orden propia", async function (this: CustomWorld) {
  await openWorkOrderDetailModal(this);
});

Given("Google Calendar está disponible para iniciar la autorización", async function (this: CustomWorld) {
  await this.page.route("https://accounts.google.com/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>Google Calendar authorization</body></html>" });
  });
  await this.stubPost("/me/calendar-connection/authorizations", 201, {
    authorization_url: CALENDAR_CONSENT_URL,
    state: "opaque-calendar-state",
  });
});

When('selecciono "Reautorizar Google Calendar"', async function (this: CustomWorld) {
  const action = this.page.getByTestId("work-order-detail-modal")
    .getByRole("button", { name: "Reautorizar Google Calendar", exact: true });
  await action.waitFor(visibleTimeout);
  await action.click({ noWaitAfter: true });
});

Then("soy redirigido al consentimiento de Google mediante el flujo existente", async function (this: CustomWorld) {
  await this.page.waitForURL(CALENDAR_CONSENT_URL, waitTimeout);
  assert.strictEqual(this.page.url(), CALENDAR_CONSENT_URL);
});

Given("la API informa que mi cuenta de Google Calendar está conectada", async function (
  this: CustomWorld,
) {
  const role = this.calendarProfileRole;
  if (!role) throw new Error("Falta el rol del participante");
  await this.stubGet("/me", aCurrentUser(role, { calendar_connection_status: "connected" }));
});

Given("la API informa que mi cuenta de Google Calendar está desconectada", async function (
  this: CustomWorld,
) {
  const role = this.calendarProfileRole;
  if (!role) throw new Error("Falta el rol del participante");
  await this.stubGet("/me", aCurrentUser(role, { calendar_connection_status: "disconnected" }));
});

Given("la API informa que mi conexión de Google Calendar requiere atención", async function (
  this: CustomWorld,
) {
  const role = this.calendarProfileRole;
  if (!role) throw new Error("Falta el rol del participante");
  await this.stubGet("/me", aCurrentUser(role, { calendar_connection_status: "action_required" }));
});

Then("visualizo que debo reautorizar mi cuenta de Google Calendar", async function (this: CustomWorld) {
  await this.page.getByTestId("work-order-detail-modal")
    .getByText("Google Calendar requiere autorización", { exact: true }).waitFor(visibleTimeout);
});

Then("dispongo de la acción {string}", async function (this: CustomWorld, action: string) {
  const button = this.page.getByTestId("work-order-detail-modal")
    .getByRole("button", { name: action, exact: true });
  await button.waitFor(visibleTimeout);
  assert.ok(await button.isEnabled(), "La acción de reautorización debe estar disponible");
});

When("consulto el detalle de una orden propia", async function (this: CustomWorld) {
  await openWorkOrderDetailModal(this);
});

When(/^consulto una orden propia en (el listado de turnos|el detalle de la orden)$/, async function (
  this: CustomWorld,
  surface: string,
) {
  if (surface === "el detalle de la orden") {
    await openWorkOrderDetailModal(this);
    return;
  }
  const route = this.calendarProfileRole === "provider"
    ? ROUTES.provider.jobs
    : ROUTES.consumer.services;
  await this.page.goto(`${APP_URL}${route}`, { waitUntil: "domcontentloaded" });
  const accepted = this.page.getByRole("tab", { name: "Aceptadas", exact: true });
  await accepted.waitFor(visibleTimeout);
  await accepted.click();
  await this.page.getByTestId("proposal-card").first().waitFor(visibleTimeout);
});

Then('visualizo "Google Calendar vinculado"', async function (this: CustomWorld) {
  const modal = this.page.getByTestId("work-order-detail-modal");
  const surface = await modal.isVisible() ? modal : this.page.getByRole("main");
  await surface.getByText("Google Calendar vinculado", { exact: true }).waitFor(visibleTimeout);
});

Then("no visualizo una confirmación de sincronización de esa cita", async function (
  this: CustomWorld,
) {
  const modal = this.page.getByTestId("work-order-detail-modal");
  const surface = await modal.isVisible() ? modal : this.page.getByRole("main");
  assert.strictEqual(await surface.getByText(/sincronizad[ao]/i).count(), 0);
});

Then("visualizo una invitación para vincular Google Calendar", async function (this: CustomWorld) {
  await this.page.getByTestId("work-order-detail-modal")
    .getByText("Vinculá Google Calendar desde", { exact: false }).waitFor(visibleTimeout);
});

Then("dispongo de un enlace a Mi perfil dentro de mi rol", async function (this: CustomWorld) {
  const link = this.page.getByTestId("work-order-detail-modal")
    .getByRole("link", { name: "Mi perfil", exact: true });
  await link.waitFor(visibleTimeout);
  const profileRoute = this.calendarProfileRole === "provider"
    ? ROUTES.provider.profile
    : ROUTES.consumer.profile;
  assert.strictEqual(await link.getAttribute("href"), profileRoute);
});
