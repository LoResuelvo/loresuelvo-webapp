import { Given, Then, When } from "@cucumber/cucumber";
import assert from "assert";
import { ROUTES } from "../../lib/routes";
import { aCurrentUser, aProposal, aWorkOrder } from "../support/factories";
import { APP_URL, CustomWorld, visibleTimeout } from "../support/world";
import { openWorkOrderDetailModal } from "../work-orders/view_work_order_detail_steps";

const PROPOSAL_ID = 42;
const WORK_ORDER_ID = 10;

Given(/^que soy un participante autenticado con rol (consumidor|prestador)$/, async function (
  this: CustomWorld,
  label: string,
) {
  const role = label === "prestador" ? "provider" : "consumer";
  await this.setSession(role);
  await this.stubGet("/service-proposals", [aProposal(role, { id: PROPOSAL_ID })]);
  const order = aWorkOrder({ id: WORK_ORDER_ID, service_proposal_id: PROPOSAL_ID });
  await this.stubGet(`/work-orders?service_proposal_id=${PROPOSAL_ID}`, order);
  await this.stubGet(`/work-orders/${WORK_ORDER_ID}`, order);
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
