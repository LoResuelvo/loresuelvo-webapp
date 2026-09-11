import { Given, Then, When } from "@cucumber/cucumber";
import assert from "assert";
import type { CalendarConnectionStatus } from "../../domain/user/types";
import { ROUTES } from "../../lib/routes";
import { APP_URL, CustomWorld, visibleTimeout } from "../support/world";
import { aCurrentUser, anApiError } from "../support/factories";

const calendarStatuses: readonly CalendarConnectionStatus[] = [
  "disconnected",
  "connected",
  "action_required",
];

function isCalendarStatus(value: string): value is CalendarConnectionStatus {
  return calendarStatuses.some((status) => status === value);
}

function calendarStatusFromLabel(label: string): CalendarConnectionStatus {
  if (isCalendarStatus(label)) return label;
  throw new Error(`Estado de Calendar no soportado: ${label}`);
}

Given("que estoy autenticado", async function (this: CustomWorld) {
  await this.setSession("consumer");
  await this.stubGet("/categories", []);
  await this.page.goto(`${APP_URL}${ROUTES.consumer.home}`, { waitUntil: "domcontentloaded" });
});

Given("la consulta de mi perfil no está disponible", async function (this: CustomWorld) {
  await this.stubGet("/me", anApiError("Profile service unavailable"), 503);
});

Given(
  "mi perfil informa el estado de Google Calendar {string}",
  async function (this: CustomWorld, status: string) {
    this.calendarConnectionStatus = calendarStatusFromLabel(status);
  },
);

When("abro mi perfil de LoResuelvo", async function (this: CustomWorld) {
  if (!this.calendarProfileRole) throw new Error("Falta definir el rol del perfil");

  const currentMeStub = (await this.getStubs()).find(
    (stub) => stub.method === "GET" && stub.endpoint === "/me",
  );
  if (!currentMeStub || currentMeStub.status < 500) {
    if (!this.calendarConnectionStatus) throw new Error("Falta definir el estado de Calendar");

    const calendarConnectionStatus = calendarStatusFromLabel(this.calendarConnectionStatus);
    const profile =
      this.calendarProfileRole === "provider"
        ? aCurrentUser("provider", { calendar_connection_status: calendarConnectionStatus })
        : aCurrentUser("consumer", { calendar_connection_status: calendarConnectionStatus });
    await this.stubGet("/me", profile);
  }

  const profileRoute =
    this.calendarProfileRole === "consumer"
      ? ROUTES.consumer.profile
      : ROUTES.provider.profile;
  const avatarButton = this.page.locator('header button[aria-haspopup="true"]');
  await avatarButton.waitFor(visibleTimeout);
  await avatarButton.click();
  await this.page.getByRole("link", { name: "Mi perfil", exact: true }).click();
  await this.page.waitForURL(`${APP_URL}${profileRoute}`);
  await this.page.waitForLoadState("domcontentloaded");
});

Then(
  "veo la integración {string} como no vinculada",
  async function (this: CustomWorld, integrationName: string) {
    const status = this.page.getByText("No vinculada", { exact: true });
    await status.waitFor(visibleTimeout);
    assert.ok(await status.isVisible(), `No se visualiza el estado de ${integrationName}.`);
  },
);

Then(
  "veo la integración {string} como vinculada y sincronizada",
  async function (this: CustomWorld, integrationName: string) {
    const status = this.page.getByText("Vinculada y sincronizada", { exact: true });
    await status.waitFor(visibleTimeout);
    assert.ok(await status.isVisible(), `No se visualiza el estado de ${integrationName}.`);
  },
);

Then("no veo una acción para volver a vincularla", async function (this: CustomWorld) {
  const calendarCard = this.page.getByRole("region", { name: "Google Calendar" });
  await calendarCard.waitFor(visibleTimeout);
  assert.strictEqual(
    await calendarCard.getByRole("button").count(),
    0,
    "Se visualiza una acción para volver a vincular Google Calendar.",
  );
});

Then(
  "veo una alerta indicando que Google Calendar requiere autorización",
  async function (this: CustomWorld) {
    const alert = this.page
      .getByRole("status")
      .filter({ hasText: "Google Calendar requiere autorización" });
    await alert.waitFor(visibleTimeout);
    assert.ok(await alert.isVisible(), "No se visualiza la alerta de autorización de Google Calendar.");
  },
);

Then(
  "veo un mensaje seguro indicando que no se pudo cargar la configuración",
  async function (this: CustomWorld) {
    const alert = this.page.getByRole("alert", { name: "No se pudo cargar la configuración" });
    await alert.waitFor(visibleTimeout);
    assert.ok(await alert.isVisible(), "No se visualiza el error seguro del perfil.");
    const message = await alert.textContent();
    assert.ok(message?.includes("No se pudo cargar la configuración"), "El mensaje de error no es seguro.");
    assert.ok(!message?.includes("Profile service unavailable"), "El mensaje expone detalles internos.");
  },
);

Then(
  "veo una acción para reintentar la consulta",
  async function (this: CustomWorld) {
    const retry = this.page.getByRole("button", { name: "Reintentar consulta", exact: true });
    await retry.waitFor(visibleTimeout);

    const role = this.calendarProfileRole === "provider" ? "provider" : "consumer";
    await this.stubGet("/me", aCurrentUser(role));
    const updatedMeStub = (await this.getStubs()).find(
      (stub) => stub.method === "GET" && stub.endpoint === "/me",
    );
    assert.strictEqual(updatedMeStub?.status, 200, "El stub de recuperación no quedó configurado.");
    await retry.click();

    const profileHeading = this.page.getByRole("heading", { name: "Mi perfil", exact: true });
    await profileHeading.waitFor(visibleTimeout);
    assert.ok(await profileHeading.isVisible(), "La consulta no se recupera después de reintentar.");
  },
);
