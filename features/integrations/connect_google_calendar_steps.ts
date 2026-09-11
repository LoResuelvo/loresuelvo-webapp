import { Given, Then, When } from "@cucumber/cucumber";
import assert from "assert";
import type { CalendarConnectionStatus } from "../../domain/user/types";
import { ROUTES } from "../../lib/routes";
import { APP_URL, CustomWorld, visibleTimeout } from "../support/world";
import { aCurrentUser } from "../support/factories";

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

Given(
  "mi perfil informa el estado de Google Calendar {string}",
  async function (this: CustomWorld, status: string) {
    this.calendarConnectionStatus = calendarStatusFromLabel(status);
  },
);

When("abro mi perfil de LoResuelvo", async function (this: CustomWorld) {
  if (!this.calendarProfileRole) throw new Error("Falta definir el rol del perfil");
  if (!this.calendarConnectionStatus) throw new Error("Falta definir el estado de Calendar");

  const calendarConnectionStatus = calendarStatusFromLabel(this.calendarConnectionStatus);
  const profile =
    this.calendarProfileRole === "provider"
      ? aCurrentUser("provider", { calendar_connection_status: calendarConnectionStatus })
      : aCurrentUser("consumer", { calendar_connection_status: calendarConnectionStatus });
  await this.stubGet("/me", profile);

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
