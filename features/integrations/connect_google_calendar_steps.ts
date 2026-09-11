import { Given, Then, When } from "@cucumber/cucumber";
import assert from "assert";
import type { CalendarConnectionStatus } from "../../domain/user/types";
import { ROUTES } from "../../lib/routes";
import { APP_URL, CustomWorld, visibleTimeout, waitTimeout } from "../support/world";
import { aCurrentUser, anApiError } from "../support/factories";

const calendarStatuses: readonly CalendarConnectionStatus[] = [
  "disconnected",
  "connected",
  "action_required",
];

const calendarAuthorizationResponse = {
  authorization_url: "https://accounts.google.com/o/oauth2/v2/auth?client_id=loresuelvo-test",
  state: "opaque-calendar-state",
};

type CalendarCallbackResult = "success" | "cancelled";

function isCalendarStatus(value: string): value is CalendarConnectionStatus {
  return calendarStatuses.some((status) => status === value);
}

function calendarStatusFromLabel(label: string): CalendarConnectionStatus {
  if (isCalendarStatus(label)) return label;
  throw new Error(`Estado de Calendar no soportado: ${label}`);
}

function calendarCallbackResultFromLabel(label: string): CalendarCallbackResult {
  if (label === "success" || label === "cancelled") return label;
  throw new Error(`Resultado de Calendar no soportado: ${label}`);
}

Given("que Google autorizó el acceso al calendario", async function (this: CustomWorld) {
  await this.setSession("consumer");
});

Given("que rechacé el acceso al calendario en Google", async function (this: CustomWorld) {
  await this.setSession("consumer");
});

Given(
  "la API redirige a mi perfil con el resultado {string}",
  async function (this: CustomWorld, result: string) {
    this.calendarCallbackResult = calendarCallbackResultFromLabel(result);
  },
);

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
    const calendarConnectionStatus = calendarStatusFromLabel(status);
    this.calendarConnectionStatus = calendarConnectionStatus;

    const role = this.calendarProfileRole ?? "consumer";
    await this.stubGet(
      "/me",
      aCurrentUser(role, { calendar_connection_status: calendarConnectionStatus }),
    );
  },
);

Given("la API devuelve una URL de consentimiento de Google Calendar", async function (this: CustomWorld) {
  await this.page.route("https://accounts.google.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body>Google Calendar authorization</body></html>",
    });
  });

  await this.stubPost("/me/calendar-connection/authorizations", 201, {
    ...calendarAuthorizationResponse,
  });
});

Given("que estoy autenticado con Google Calendar desvinculado", async function (this: CustomWorld) {
  await this.setSession("consumer");
  await this.stubGet(
    "/me",
    aCurrentUser("consumer", { calendar_connection_status: "disconnected" }),
  );
  await this.page.goto(`${APP_URL}${ROUTES.consumer.profile}`, { waitUntil: "domcontentloaded" });
});

Given("la solicitud de autorización todavía está en curso", async function (this: CustomWorld) {
  await this.stubPost(
    "/me/calendar-connection/authorizations",
    201,
    calendarAuthorizationResponse,
    2000,
  );
});

Given("la API no puede iniciar la autorización", async function (this: CustomWorld) {
  await this.stubPost(
    "/me/calendar-connection/authorizations",
    503,
    { error: "Internal calendar provider failure" },
  );
});

Then("veo la acción de vinculación ocupada y deshabilitada", async function (this: CustomWorld) {
  const calendarCard = this.page.getByRole("region", { name: "Google Calendar" });
  const button = calendarCard.getByRole("button");
  await button.waitFor(visibleTimeout);

  assert.ok(await button.isDisabled(), "La acción de vinculación debería estar deshabilitada.");
  assert.strictEqual(
    await button.textContent(),
    "Conectando con Google Calendar…",
    "La acción no muestra el estado de espera.",
  );
});

Then(
  "no puedo iniciar otra autorización mientras la primera está pendiente",
  async function (this: CustomWorld) {
    assert.strictEqual(
      this.calendarAuthorizationAttempts,
      1,
      "Se permitió iniciar una segunda autorización.",
    );
    const button = this.page.getByRole("region", { name: "Google Calendar" }).getByRole("button");
    assert.ok(await button.isDisabled(), "La acción debería seguir deshabilitada mientras espera.");
  },
);

Then("permanezco en mi perfil con el estado no vinculado", async function (this: CustomWorld) {
  await this.page
    .getByText("No pudimos iniciar la vinculación con Google Calendar", { exact: false })
    .waitFor(visibleTimeout);
  assert.ok(
    this.page.url().endsWith(ROUTES.consumer.profile),
    "La página abandonó el perfil después del error de autorización.",
  );
  await this.page.getByText("No vinculada", { exact: true }).waitFor(visibleTimeout);
});

Then(
  "veo un error seguro que no expone detalles internos",
  async function (this: CustomWorld) {
    const error = this.page
      .getByRole("alert")
      .filter({ hasText: "No pudimos iniciar la vinculación con Google Calendar" });
    await error.waitFor(visibleTimeout);
    const message = await error.textContent();
    assert.ok(
      message?.includes("No pudimos iniciar la vinculación con Google Calendar"),
      "No se visualiza el mensaje seguro de autorización.",
    );
    assert.ok(
      !message?.includes("Internal calendar provider failure"),
      "El error de autorización expone detalles internos.",
    );
  },
);

Then(
  "la acción {string} vuelve a estar disponible",
  async function (this: CustomWorld, action: string) {
    const button = this.page
      .getByRole("region", { name: "Google Calendar" })
      .getByRole("button", { name: action, exact: true });
    await button.waitFor(visibleTimeout);
    assert.ok(await button.isEnabled(), "La acción de vinculación no volvió a estar disponible.");
  },
);

When("activo {string}", async function (this: CustomWorld, action: string) {
  if (!this.calendarProfileRole) throw new Error("Falta definir el rol del perfil");

  const calendarConnectionStatus = calendarStatusFromLabel(
    this.calendarConnectionStatus ?? "disconnected",
  );
  const profile = aCurrentUser(this.calendarProfileRole, {
    calendar_connection_status: calendarStatusFromLabel(calendarConnectionStatus),
  });
  await this.stubGet("/me", profile);

  const profileRoute =
    this.calendarProfileRole === "consumer" ? ROUTES.consumer.profile : ROUTES.provider.profile;
  await this.page.goto(`${APP_URL}${profileRoute}`, { waitUntil: "domcontentloaded" });

  const calendarCard = this.page.getByRole("region", { name: "Google Calendar" });
  const button = calendarCard.getByRole("button", { name: action, exact: true });
  await button.waitFor(visibleTimeout);
  this.calendarAuthorizationAttempts += 1;
  await button.click({ noWaitAfter: true });
});

Then("se inicia una única autorización web para mi cuenta", async function (this: CustomWorld) {
  assert.strictEqual(this.calendarAuthorizationAttempts, 1, "Se inició más de una autorización web.");
});

Then("soy redirigido a la URL de consentimiento de Google", async function (this: CustomWorld) {
  await this.page.waitForURL("https://accounts.google.com/**", waitTimeout);
  assert.ok(
    this.page.url().startsWith("https://accounts.google.com/"),
    "No se redirigió a la URL de consentimiento de Google.",
  );
});

When("regreso a LoResuelvo desde Google", async function (this: CustomWorld) {
  const result = this.calendarCallbackResult;
  if (!result) throw new Error("Falta definir el resultado del callback de Calendar");

  const profileRoute =
    this.calendarProfileRole === "provider"
      ? ROUTES.provider.profile
      : ROUTES.consumer.profile;
  await this.page.goto(`${APP_URL}${ROUTES.me}?calendar_result=${result}`, {
    waitUntil: "domcontentloaded",
  });
  await this.page.waitForURL(`${APP_URL}${profileRoute}`, waitTimeout);
});

Then("veo la confirmación de que Google Calendar fue vinculado", async function (this: CustomWorld) {
  const banner = this.page
    .getByRole("status")
    .filter({ hasText: "Google Calendar fue vinculado" });
  await banner.waitFor(visibleTimeout);
  assert.ok(await banner.isVisible(), "No se visualiza la confirmación de vinculación.");
  assert.strictEqual(
    this.page.url(),
    `${APP_URL}${ROUTES.consumer.profile}`,
    "El resultado del callback no se quitó de la URL.",
  );
});

Then("veo que la vinculación de Google Calendar fue cancelada", async function (this: CustomWorld) {
  const banner = this.page
    .getByRole("status")
    .filter({ hasText: "La vinculación de Google Calendar fue cancelada" });
  await banner.waitFor(visibleTimeout);
  assert.ok(await banner.isVisible(), "No se visualiza la cancelación de vinculación.");
  assert.strictEqual(
    this.page.url(),
    `${APP_URL}${ROUTES.consumer.profile}`,
    "El resultado del callback no se quitó de la URL.",
  );
});

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

Then("veo la integración como vinculada y sincronizada", async function (this: CustomWorld) {
  const status = this.page.getByText("Vinculada y sincronizada", { exact: true });
  await status.waitFor(visibleTimeout);
  assert.ok(await status.isVisible(), "No se visualiza el estado de Calendar vinculado.");
});

Then("veo la integración como no vinculada", async function (this: CustomWorld) {
  const status = this.page.getByText("No vinculada", { exact: true });
  await status.waitFor(visibleTimeout);
  assert.ok(await status.isVisible(), "No se visualiza el estado de Calendar no vinculado.");
});

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
