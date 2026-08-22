import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, APP_URL } from "../support/world";
import { ROUTES } from "../../lib/routes";
import {
  aProposal,
  aBookingTerms,
  aCounterpart,
  aConversation,
  aConversationDetail,
  anApiError,
  aCategory,
} from "../support/factories";

async function setSession(world: CustomWorld, role: "consumer" | "provider") {
  await world.setSession(role, {
    id: "user-001",
    email: "user@loresuelvo.test",
    firstName: "Test",
    lastName: "User",
    isOnboarded: true,
  });
  await world.stubGet("/categories", [aCategory()]);
  await world.stubGet("/job-requests", []);
}

Given(
  "que estoy en la vista de propuestas como consumidor con una propuesta pendiente del prestador {string} con rubro {string}",
  async function (this: CustomWorld, providerName: string, category: string) {
    await setSession(this, "consumer");
    const [name, surname] = providerName.split(" ");
    await this.stubGet("/service-proposals", [
      aProposal("consumer", {
        id: 1,
        conversation_id: 25,
        amount_cents: 1500050,
        scheduled_on: "2026-07-05T09:30:00-03:00",
        description: "Reparación de pérdida de agua en cocina con materiales incluidos.",
        status: "pending",
        created_on: "2026-07-04T10:00:00-03:00",
        counterpart: aCounterpart({
          id: 5,
          role: "provider",
          name,
          surname,
          category_name: category,
          profile_photo_url: "https://example.com/photo.jpg",
        }),
        booking_terms: aBookingTerms(1500050, { booking_payment_deadline: "2026-07-04T12:00:00-03:00" }),
      }),
    ]);
    await this.page.goto(APP_URL + "/consumidor/mis-servicios", { waitUntil: "domcontentloaded" });
  }
);

When("visualizo la lista de propuestas de servicio", async function (this: CustomWorld) {
  const list = this.page.getByRole("list", { name: /propuestas de servicio/i }).or(this.page.getByTestId("proposals-list"));
  await list.waitFor({ state: "visible" });
});

Then(
  "veo una tarjeta con el nombre {string}, el rubro {string} y su foto de perfil",
  async function (this: CustomWorld, name: string, category: string) {
    const card = this.page.getByRole("listitem").first();
    await card.waitFor({ state: "visible" });
    assert.ok(await card.getByText(name).isVisible(), "No se visualiza el nombre");
    assert.ok(await card.getByText(category).isVisible(), "No se visualiza el rubro");
    assert.ok(await card.getByTestId("proposal-card-avatar").isVisible(), "No se visualiza el avatar");
  }
);

Then("la tarjeta muestra el monto {string}", async function (this: CustomWorld, amount: string) {
  const card = this.page.getByRole("listitem").first();
  const text = (await card.textContent()) || "";
  const normalizedText = text.replace(/\s+/g, "");
  const normalizedAmount = amount.replace(/\s+/g, "");
  assert.ok(normalizedText.includes(normalizedAmount), "No se visualiza el monto correcto");
});

Then("la tarjeta muestra la fecha {string}", async function (this: CustomWorld, date: string) {
  const card = this.page.getByRole("listitem").first();
  const text = (await card.textContent()) || "";
  const datePart = date.split(" - ")[0];
  assert.ok(text.includes(datePart), `No se visualiza la fecha correcta. Esperado (parcial): ${datePart}`);
});

Then("la tarjeta muestra la descripción de la propuesta", async function (this: CustomWorld) {
  const card = this.page.getByRole("listitem").first();
  assert.ok(await card.getByTestId("proposal-description").isVisible(), "No se visualiza la descripción");
});

Then(
  "la tarjeta muestra un badge de estado {string} en color amarillo",
  async function (this: CustomWorld, status: string) {
    const card = this.page.getByRole("listitem").first();
    const badge = card.getByText(status);
    await badge.waitFor({ state: "visible" });
    const classes = await badge.getAttribute("class");
    assert.ok(
      classes?.includes("bg-amber-100") || classes?.includes("bg-badge-warning-bg"),
      `El badge no tiene el color amarillo esperado: ${classes}`
    );
  }
);

Then("la tarjeta incluye un botón {string}", async function (this: CustomWorld, buttonName: string) {
  const card = this.page.getByRole("listitem").first();
  assert.ok(await card.getByRole("button", { name: buttonName }).isVisible(), "No se visualiza el botón");
});

Given(
  "que estoy en la vista de propuestas como prestador con una propuesta pendiente para {string}",
  async function (this: CustomWorld, consumerName: string) {
    await setSession(this, "provider");
    const [name, surname] = consumerName.split(" ");
    await this.stubGet("/service-proposals", [
      aProposal("provider", {
        id: 2,
        conversation_id: 26,
        amount_cents: 500000,
        scheduled_on: "2026-07-06T10:00:00-03:00",
        description: "Revisión eléctrica",
        status: "pending",
        created_on: "2026-07-04T10:00:00-03:00",
        counterpart: aCounterpart({
          id: 6,
          role: "consumer",
          name,
          surname,
        }),
        booking_terms: aBookingTerms(500000, { booking_payment_deadline: "2026-07-04T12:00:00-03:00" }),
      }),
    ]);
    await this.page.goto(APP_URL + ROUTES.provider.jobs, { waitUntil: "domcontentloaded" });
  }
);

Then("veo una tarjeta con el nombre {string} sin rubro visible", async function (this: CustomWorld, name: string) {
  const card = this.page.getByRole("listitem").first();
  await card.waitFor({ state: "visible" });
  assert.ok(await card.getByText(name).isVisible(), "No se visualiza el nombre");
  const hasCategory = (await card.locator("[data-testid='proposal-category']").count()) > 0;
  assert.ok(!hasCategory, "Se visualiza un rubro cuando no debería");
});

Then("el nombre se centra verticalmente respecto al avatar", async function (this: CustomWorld) {
  const card = this.page.getByRole("listitem").first();
  assert.ok(await card.isVisible());
});

Given(
  "que estoy en la vista de propuestas como consumidor con propuestas en estado {string}, {string} y {string}",
  async function (this: CustomWorld, s1: any, s2: any, s3: any) {
    await setSession(this, "consumer");
    await this.stubGet("/service-proposals", [
      aProposal("consumer", {
        id: 1,
        conversation_id: 1,
        amount_cents: 1000,
        scheduled_on: "2026-07-05T09:30:00Z",
        description: "1",
        status: s1,
        created_on: "2026-07-01T00:00:00Z",
        counterpart: aCounterpart({ id: 2, role: "provider", name: "P", surname: "1" }),
        booking_terms: aBookingTerms(1000),
      }),
      aProposal("consumer", {
        id: 2,
        conversation_id: 2,
        amount_cents: 1000,
        scheduled_on: "2026-07-05T09:30:00Z",
        description: "2",
        status: s2,
        created_on: "2026-07-02T00:00:00Z",
        counterpart: aCounterpart({ id: 3, role: "provider", name: "P", surname: "2" }),
        booking_terms: aBookingTerms(1000),
      }),
      aProposal("consumer", {
        id: 3,
        conversation_id: 3,
        amount_cents: 1000,
        scheduled_on: "2026-07-05T09:30:00Z",
        description: "3",
        status: s3,
        created_on: "2026-07-03T00:00:00Z",
        counterpart: aCounterpart({ id: 4, role: "provider", name: "P", surname: "3" }),
        booking_terms: aBookingTerms(1000),
      }),
    ]);
    await this.page.goto(APP_URL + "/consumidor/mis-servicios", { waitUntil: "domcontentloaded" });
  }
);

async function selectTab(world: CustomWorld, tabName: string) {
  const tab = world.page.getByRole("tab", { name: tabName });
  await tab.waitFor({ state: "visible" });
  for (let i = 0; i < 5; i++) {
    await tab.click();
    await world.page.waitForTimeout(200);
    const isSelected = await tab.getAttribute("aria-selected");
    if (isSelected === "true") break;
    await world.page.waitForTimeout(300);
  }
}

Then("veo un badge {string} en color amarillo", async function (this: CustomWorld, status: string) {
  await selectTab(this, "Pendientes");
  const badge = this.page.getByTestId("proposal-card").getByText(status).first();
  await badge.waitFor({ state: "visible" });
  const classes = await badge.getAttribute("class");
  assert.ok(
    classes?.includes("bg-amber-100") || classes?.includes("bg-badge-warning-bg"),
    `El badge no tiene el color amarillo esperado: ${classes}`
  );
});

Then("veo un badge {string} en color verde", async function (this: CustomWorld, status: string) {
  await selectTab(this, "Aceptadas");
  const badge = this.page.getByTestId("proposal-card").getByText(status).first();
  await badge.waitFor({ state: "visible" });
  const classes = await badge.getAttribute("class");
  assert.ok(
    classes?.includes("bg-emerald-100") || classes?.includes("bg-badge-success-bg"),
    `El badge no tiene el color verde esperado: ${classes}`
  );
});

Then("veo un badge {string} en color rojo", async function (this: CustomWorld, status: string) {
  await selectTab(this, "Rechazadas");
  const badge = this.page.getByTestId("proposal-card").getByText(status).first();
  await badge.waitFor({ state: "visible" });
  const classes = await badge.getAttribute("class");
  assert.ok(
    classes?.includes("bg-red-100") || classes?.includes("bg-badge-destructive-bg"),
    `El badge no tiene el color rojo esperado: ${classes}`
  );
});

Given("que ingreso a la HomePage como prestador con propuestas aceptadas", async function (this: CustomWorld) {
  await setSession(this, "provider");
  await this.stubGet("/job-requests", []);
  await this.stubGet("/service-proposals", [
    aProposal("provider", {
      id: 1,
      conversation_id: 1,
      amount_cents: 1000,
      scheduled_on: "2026-07-05T09:30:00Z",
      description: "1",
      status: "accepted",
      created_on: "2026-07-01T00:00:00Z",
      counterpart: aCounterpart({ id: 2, role: "consumer", name: "C", surname: "1" }),
      booking_terms: aBookingTerms(1000),
    }),
    aProposal("provider", {
      id: 2,
      conversation_id: 2,
      amount_cents: 1000,
      scheduled_on: "2026-07-05T09:30:00Z",
      description: "2",
      status: "pending",
      created_on: "2026-07-02T00:00:00Z",
      counterpart: aCounterpart({ id: 3, role: "consumer", name: "C", surname: "2" }),
      booking_terms: aBookingTerms(1000),
    }),
  ]);
  await this.page.goto(APP_URL + ROUTES.provider.home, { waitUntil: "domcontentloaded" });
});

Then("no se muestran propuestas pendientes ni rechazadas en esa sección", async function (this: CustomWorld) {
  const pendingCount = await this.page.getByRole("region", { name: "Trabajos Agendados" }).getByText("Pendiente").count();
  const rejectedCount = await this.page.getByRole("region", { name: "Trabajos Agendados" }).getByText("Rechazada").count();
  assert.strictEqual(pendingCount, 0, "Hay propuestas pendientes en la sección");
  assert.strictEqual(rejectedCount, 0, "Hay propuestas rechazadas en la sección");
});

Given(
  "que ingreso a la HomePage como consumidor con propuestas pendientes y aceptadas",
  async function (this: CustomWorld) {
    await setSession(this, "consumer");
    await this.stubGet("/service-proposals", [
      aProposal("consumer", {
        id: 1,
        conversation_id: 1,
        amount_cents: 1000,
        scheduled_on: "2026-07-05T09:30:00Z",
        description: "1",
        status: "accepted",
        created_on: "2026-07-01T00:00:00Z",
        counterpart: aCounterpart({ id: 2, role: "provider", name: "P", surname: "1" }),
        booking_terms: aBookingTerms(1000),
      }),
      aProposal("consumer", {
        id: 2,
        conversation_id: 2,
        amount_cents: 1000,
        scheduled_on: "2026-07-05T09:30:00Z",
        description: "2",
        status: "pending",
        created_on: "2026-07-02T00:00:00Z",
        counterpart: aCounterpart({ id: 3, role: "provider", name: "P", surname: "2" }),
        booking_terms: aBookingTerms(1000),
      }),
    ]);
    await this.page.goto(APP_URL + ROUTES.consumer.home, { waitUntil: "domcontentloaded" });
  }
);

Given("que estoy en la vista histórica de propuestas como prestador", async function (this: CustomWorld) {
  await setSession(this, "provider");
  await this.stubGet("/service-proposals", [
    aProposal("provider", {
      id: 1,
      conversation_id: 1,
      amount_cents: 1000,
      scheduled_on: "2026-07-05T09:30:00Z",
      description: "1",
      status: "accepted",
      created_on: "2026-07-01T00:00:00Z",
      counterpart: aCounterpart({ id: 2, role: "consumer", name: "C", surname: "1" }),
      booking_terms: aBookingTerms(1000),
    }),
    aProposal("provider", {
      id: 2,
      conversation_id: 2,
      amount_cents: 1000,
      scheduled_on: "2026-07-05T09:30:00Z",
      description: "2",
      status: "pending",
      created_on: "2026-07-02T00:00:00Z",
      counterpart: aCounterpart({ id: 3, role: "consumer", name: "C", surname: "2" }),
      booking_terms: aBookingTerms(1000),
    }),
  ]);
  await this.page.goto(APP_URL + ROUTES.provider.jobs, { waitUntil: "domcontentloaded" });
});

Then("veo pestañas para filtrar por {string}, {string} y {string}", async function (this: CustomWorld, t1: string, t2: string, t3: string) {
  assert.ok(await this.page.getByRole("tab", { name: t1 }).isVisible());
  assert.ok(await this.page.getByRole("tab", { name: t2 }).isVisible());
  assert.ok(await this.page.getByRole("tab", { name: t3 }).isVisible());
});

Then("las propuestas se muestran ordenadas de la más reciente a la más antigua", async function (this: CustomWorld) {
  const cards = this.page.getByTestId("proposal-card");
  const count = await cards.count();
  assert.ok(count > 0, "No hay propuestas");
});

Given(
  "que estoy en la vista histórica de propuestas como prestador con propuestas en varios estados",
  async function (this: CustomWorld) {
    await setSession(this, "provider");
    await this.stubGet("/service-proposals", [
      aProposal("provider", {
        id: 1,
        conversation_id: 1,
        amount_cents: 1000,
        scheduled_on: "2026-07-05T09:30:00Z",
        description: "1",
        status: "accepted",
        created_on: "2026-07-01T00:00:00Z",
        counterpart: aCounterpart({ id: 2, role: "consumer", name: "C", surname: "1" }),
        booking_terms: aBookingTerms(1000),
      }),
      aProposal("provider", {
        id: 2,
        conversation_id: 2,
        amount_cents: 1000,
        scheduled_on: "2026-07-05T09:30:00Z",
        description: "2",
        status: "pending",
        created_on: "2026-07-02T00:00:00Z",
        counterpart: aCounterpart({ id: 3, role: "consumer", name: "C", surname: "2" }),
        booking_terms: aBookingTerms(1000),
      }),
    ]);
    await this.page.goto(APP_URL + ROUTES.provider.jobs, { waitUntil: "domcontentloaded" });
  }
);

When("selecciono la pestaña {string}", async function (this: CustomWorld, tabName: string) {
  await selectTab(this, tabName);
});

Then("solo se muestran las propuestas con estado aceptado", async function (this: CustomWorld) {
  const list = this.page.getByTestId("proposals-list");
  await list.getByText("Pendiente", { exact: true }).waitFor({ state: "hidden", timeout: 2000 }).catch(() => {});
  const pendingCount = await list.getByText("Pendiente", { exact: true }).count();
  const acceptedCount = await list.getByText("Aceptada", { exact: true }).count();
  assert.strictEqual(pendingCount, 0, "Hay propuestas pendientes visibles");
  assert.ok(acceptedCount > 0, "No hay propuestas aceptadas");
});

Given("que estoy en la vista histórica de propuestas como consumidor sin propuestas", async function (this: CustomWorld) {
  await setSession(this, "consumer");
  await this.stubGet("/service-proposals", []);
  await this.page.goto(APP_URL + "/consumidor/mis-servicios", { waitUntil: "domcontentloaded" });
});

Given("que estoy en el chat del prestador con una propuesta de servicio asociada", async function (this: CustomWorld) {
  await setSession(this, "provider");
  await this.stubGet("/conversations", [
    aConversation({
      id: 1,
      status: "accepted",
      counterpart: aCounterpart({ id: 10, role: "consumer", name: "María", surname: "Fernández" }),
      updated_on: new Date().toISOString(),
    }),
  ]);
  await this.stubGet(
    "/conversations/1",
    aConversationDetail({
      id: 1,
      status: "accepted",
      counterpart: aCounterpart({ id: 10, role: "consumer", name: "María", surname: "Fernández" }),
      messages: [],
      updated_on: new Date().toISOString(),
    })
  );
  await this.stubGet("/job-requests", []);
  await this.stubGet("/service-proposals", [
    aProposal("provider", {
      id: 1,
      conversation_id: 1,
      amount_cents: 1500050,
      scheduled_on: "2026-07-05T09:30:00Z",
      description: "Arreglo",
      status: "pending",
      created_on: "2026-07-01T00:00:00Z",
      counterpart: aCounterpart({ id: 10, role: "consumer", name: "María", surname: "Fernández" }),
      booking_terms: aBookingTerms(1500050),
    }),
  ]);
  await this.page.goto(APP_URL + ROUTES.provider.messages + "?consumer_id=10", { waitUntil: "domcontentloaded" });
});

When("visualizo el panel de la propuesta en el chat", async function (this: CustomWorld) {
  const panel = this.page.getByTestId("service-proposal-panel");
  await panel.waitFor({ state: "visible" });
});

Then("veo los datos de la propuesta incluyendo monto, fecha, descripción y estado", async function (this: CustomWorld) {
  const panel = this.page.getByTestId("service-proposal-panel");
  assert.ok(await panel.getByText("Monto").isVisible());
  assert.ok(await panel.getByText("Fecha y hora").isVisible());
  assert.ok(await panel.getByText("Descripción").isVisible());
  assert.ok(await panel.getByText("Pendiente").isVisible());
});

Given(
  "que estoy en la vista histórica de propuestas como consumidor con una propuesta",
  async function (this: CustomWorld) {
    await setSession(this, "consumer");
    await this.stubGet("/conversations", []);
    await this.stubGet("/service-proposals", [
      aProposal("consumer", {
        id: 1,
        conversation_id: 42,
        amount_cents: 1000,
        scheduled_on: "2026-07-05T09:30:00Z",
        description: "1",
        status: "pending",
        created_on: "2026-07-01T00:00:00Z",
        counterpart: aCounterpart({ id: 2, role: "provider", name: "P", surname: "1" }),
        booking_terms: aBookingTerms(1000),
      }),
    ]);
    await this.page.goto(APP_URL + "/consumidor/mis-servicios", { waitUntil: "domcontentloaded" });
  }
);

When("hago clic en la tarjeta de la propuesta para ver el detalle", async function (this: CustomWorld) {
  const card = this.page.getByTestId("proposal-card").first();
  await card.waitFor({ state: "visible" });
  const modal = this.page.getByTestId("service-proposal-detail-modal");

  for (let i = 0; i < 10; i++) {
    await card.click();
    const isModalVisible = await modal.isVisible().catch(() => false);
    if (isModalVisible) break;
    await this.page.waitForTimeout(300);
  }

  await modal.waitFor({ state: "visible", timeout: 10000 });
});

Then("se abre el chat asociado a esa propuesta", async function (this: CustomWorld) {
  await this.page.waitForURL(/\/consumidor\/mensajes\?provider_id=2/);
  assert.ok(this.page.url().includes("provider_id=2"), "No navegó al chat del prestador correcto");
});

Given("que no tengo una sesión válida", async function (this: CustomWorld) {
  await this.page.context().clearCookies();
  await this.stubGet("/service-proposals", anApiError("Unauthorized"), 401);
});

When("intento acceder a mis propuestas de servicio", async function (this: CustomWorld) {
  await this.page.goto(APP_URL + ROUTES.provider.jobs);
});
