import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import type { Locator } from "playwright";
import { CustomWorld } from "../support/world";
import { ROUTES } from "../../lib/routes";
import type { ApiProviderConversion } from "../../infrastructure/api/types";
import {
  aConversionResponse,
  aFilteredConversionResponse,
  anEmptyFunnelWithRequestsResponse,
  assertText,
  getSituationResponse,
  CONVERSION_TEST_RANGES,
} from "../support/conversion-factory";
import { t } from "../../infrastructure/i18n/translations";

Given("que soy un prestador autenticado con propuestas y avances informados por la API", async function (this: CustomWorld) {
  await this.setSession("provider");
  await this.stubGet("/providers/me/statistics/conversion", aConversionResponse());
});

Given(/^algunas propuestas del período alcanzaron etapas después de su fecha de fin|informa solicitudes recibidas, aceptadas y pendientes dentro del período$/, async function (this: CustomWorld) {
  assert.ok(await this.hasApiStub("GET", "/providers/me/statistics/conversion"));
});

When(/^accedo a Conversión desde Mi desempeño|consulto Conversión$/, async function (this: CustomWorld) {
  await this.page.goto(`${this.appUrl}${ROUTES.provider.conversion}`);
});

Then("visualizo emitidas, contratadas, con finalización informada y con pago completo de esa cohorte", async function (this: CustomWorld) {
  await assertText(this.page.getByTestId("funnel-stage-issued"), t.providerConversion.issued, "10");
  await assertText(this.page.getByTestId("funnel-stage-contracted"), t.providerConversion.contracted, "6");
  await assertText(this.page.getByTestId("funnel-stage-reported"), t.providerConversion.reported, "4");
  await assertText(this.page.getByTestId("funnel-stage-paid"), t.providerConversion.paid, "2");
});

Then("visualizo las tasas sobre la cohorte y la etapa anterior con sus denominadores", async function (this: CustomWorld) {
  await assertText(this.page.getByTestId("funnel-stage-contracted"), t.providerConversion.cohortRate, "6 de 10 emitidas (60 %)", t.providerConversion.previousStageRate);
  await assertText(this.page.getByTestId("funnel-stage-reported"), t.providerConversion.cohortRate, "4 de 10 emitidas (40 %)", t.providerConversion.previousStageRate, "4 de 6 contratadas (66,67 %)");
  await assertText(this.page.getByTestId("funnel-stage-paid"), t.providerConversion.cohortRate, "2 de 10 emitidas (20 %)", t.providerConversion.previousStageRate, "2 de 4 con finalización informada (50 %)");
});

Then("visualizo las propuestas sin contratación observada sin llamarlas rechazadas o perdidas", async function (this: CustomWorld) {
  await assertText(this.page.getByTestId("uncontracted-proposals"), t.providerConversion.uncontracted, "4");
  assert.equal(/rechazada|rechazadas|perdida|perdidas/i.test(await this.page.locator("main").innerText()), false);
});

Then("visualizo el período efectivo y el instante de observación informados", async function (this: CustomWorld) {
  await assertText(this.page.getByTestId("conversion-period"), "1/8/26", "31/8/26");
  await assertText(this.page.getByTestId("conversion-observed-at"), t.providerConversion.observedAt, "15/9/26");
});

Then("se explica que los resultados pueden cambiar cuando las propuestas avanzan", async function (this: CustomWorld) {
  await this.page.getByText(t.providerConversion.cohortHelp, { exact: true }).waitFor({ state: "visible" });
});

Given("que estoy consultando Conversión con un rango inicial", async function (this: CustomWorld) {
  await this.setSession("provider");
  await this.stubGet("/providers/me/statistics/conversion", aConversionResponse());
  await this.page.goto(`${this.appUrl}${ROUTES.provider.conversion}`);
  await assertText(this.page.getByTestId("conversion-period"), "1/8/26", "31/8/26");
});

Given("seleccioné un rango válido de fechas de creación", async function (this: CustomWorld) {
  const params = new URLSearchParams({ from: "2026-06-01T00:00:00-03:00", to: "2026-07-01T00:00:00-03:00" });
  await this.stubGet(`/providers/me/statistics/conversion?${params}`, aFilteredConversionResponse());
  await this.page.getByLabel("Desde", { exact: true }).fill("2026-06-01");
  await this.page.getByLabel("Hasta (incluido)").fill("2026-06-30");
});

When("aplico el rango seleccionado", async function (this: CustomWorld) {
  await this.page.getByRole("button", { name: "Aplicar filtros" }).click();
});

Then("visualizo el embudo informado para ese nuevo conjunto de propuestas", async function (this: CustomWorld) {
  const issued = this.page.getByTestId("funnel-stage-issued");
  await issued.getByText("20", { exact: true }).waitFor({ state: "visible" });
  await assertText(issued, "20");
  await assertText(this.page.getByTestId("funnel-stage-contracted"), "12");
  await assertText(this.page.getByTestId("funnel-stage-reported"), "8");
  await assertText(this.page.getByTestId("funnel-stage-paid"), "4");
  await assertText(this.page.getByTestId("uncontracted-proposals"), "8");
});

Then("el período visible corresponde a la respuesta consultada", async function (this: CustomWorld) {
  const period = this.page.getByTestId("conversion-period");
  await period.getByText("1/6/26").waitFor({ state: "visible" });
  await assertText(period, "1/6/26", "1/7/26");
});

Then("no dispongo de agrupación, comparación ni evolución temporal", async function (this: CustomWorld) {
  assert.equal(await this.page.getByLabel("Agrupación").count(), 0);
  assert.equal(await this.page.getByRole("checkbox", { name: /comparar/i }).count(), 0);
  assert.equal(await this.page.getByRole("table").count(), 0);
  assert.equal(await this.page.getByText("Evolución cronológica").count(), 0);
});

Given("que estoy consultando Conversión", async function (this: CustomWorld) {
  await this.setSession("provider");
  await this.stubGet("/providers/me/statistics/conversion", aConversionResponse());
  await this.page.goto(`${this.appUrl}${ROUTES.provider.conversion}`);
  await assertText(this.page.getByTestId("conversion-period"), "1/8/26", "31/8/26");
});

Given(/^seleccioné un rango (incompleto|invertido|mayor a 365 días|con una fecha futura)$/, async function (this: CustomWorld, rango: string) {
  const [from, through] = CONVERSION_TEST_RANGES[rango.trim()] ?? [];
  await this.page.getByLabel("Desde", { exact: true }).fill(from);
  await this.page.getByLabel("Hasta (incluido)").fill(through);
});

Then("visualizo un mensaje accesible de rango inválido", async function (this: CustomWorld) {
  const alert = this.page.locator('form [role="alert"]');
  await alert.waitFor({ state: "visible" });
  const text = await alert.innerText();
  assert.ok(text.includes(t.providerConversion.invalidRange) || text.includes(t.providerConversion.futureDate));
});

Then("conservo la última consulta válida sin presentarla como resultado del rango rechazado", async function (this: CustomWorld) {
  await assertText(this.page.getByTestId("conversion-period"), "1/8/26", "31/8/26");
  await assertText(this.page.getByTestId("funnel-stage-issued"), "10");
  await assertText(this.page.getByTestId("funnel-stage-contracted"), "6");
});

Given("que la API informa una cohorte sin propuestas", async function (this: CustomWorld) {
  await this.setSession("provider");
  await this.stubGet("/providers/me/statistics/conversion", anEmptyFunnelWithRequestsResponse());
});

Then("visualizo el bloque de solicitudes con su porcentaje de aceptación", async function (this: CustomWorld) {
  await assertText(this.page.getByTestId("conversion-requests-section"), t.providerConversion.requestsTitle);
  await assertText(this.page.getByTestId("requests-received"), "8");
  await assertText(this.page.getByTestId("requests-accepted"), "6");
  await assertText(this.page.getByTestId("requests-pending"), "2");
  await assertText(this.page.getByTestId("requests-acceptance-rate"), t.providerConversion.acceptanceRate, "6 de 8 recibidas (75 %)");
});

Then("ese bloque permanece visible aunque el embudo esté vacío", async function (this: CustomWorld) {
  await assertText(this.page.getByTestId("funnel-stage-issued"), "0");
  assert.ok(await this.page.getByTestId("conversion-requests-section").isVisible());
});

Then("no se presenta la aceptación como contratación ni como etapa del embudo", async function (this: CustomWorld) {
  const sectionText = await this.page.getByTestId("conversion-requests-section").innerText();
  assert.equal(/contratación|contratada|contratadas/i.test(sectionText), false);
  const funnelText = await this.page.locator('section[aria-labelledby="conversion-funnel-title"]').innerText();
  assert.equal(/aceptada|aceptadas|solicitud|solicitudes/i.test(funnelText), false);
});

let currentConversionResponse: ApiProviderConversion | null = null;

Given(
  /^que la API informa (una cohorte y solicitudes vacías|propuestas emitidas sin contrataciones|solicitudes recibidas sin aceptaciones)$/,
  async function (this: CustomWorld, situacion: string) {
    await this.setSession("provider");
    currentConversionResponse = getSituationResponse(situacion);
    await this.stubGet("/providers/me/statistics/conversion", currentConversionResponse);
  }
);

Then("visualizo los conteos reales informados", async function (this: CustomWorld) {
  assert.ok(currentConversionResponse, "currentConversionResponse is required");
  const { proposals, requests } = currentConversionResponse;
  await assertText(this.page.getByTestId("funnel-stage-issued"), String(proposals.stages.issued));
  await assertText(this.page.getByTestId("funnel-stage-contracted"), String(proposals.stages.contracted));
  await assertText(this.page.getByTestId("requests-received"), String(requests.received));
  await assertText(this.page.getByTestId("requests-accepted"), String(requests.accepted));
});

Then(
  /^el porcentaje correspondiente se muestra como (No disponible|cero)$/,
  async function (this: CustomWorld, porcentaje: string) {
    const contracted = this.page.getByTestId("funnel-stage-contracted");
    const requestsRate = this.page.getByTestId("requests-acceptance-rate");
    if (porcentaje === "No disponible") {
      await assertText(contracted, t.providerConversion.unavailable);
      await assertText(requestsRate, t.providerConversion.unavailable);
      assert.equal((await this.page.locator("main").innerText()).includes("0 %"), false);
      return;
    }
    assert.ok(currentConversionResponse, "currentConversionResponse is required");
    if (currentConversionResponse.proposals.rates.contracted.cohort.percentage === 0) {
      await assertText(contracted, "0 %");
      assert.equal((await contracted.innerText()).includes(t.providerConversion.unavailable), false);
    }
    if (currentConversionResponse.requests.acceptance_rate.percentage === 0) {
      await assertText(requestsRate, "0 %");
      assert.equal((await requestsRate.innerText()).includes(t.providerConversion.unavailable), false);
    }
  }
);

Given("que la consulta inicial de Conversión permanece pendiente", async function (this: CustomWorld) {
  await this.setSession("provider");
  await this.addApiStub({
    method: "GET",
    endpoint: "/providers/me/statistics/conversion",
    status: 200,
    body: aConversionResponse(),
    delayMs: 15000,
  });
});

When("accedo a Conversión", async function (this: CustomWorld) {
  await this.page.goto(`${this.appUrl}${ROUTES.provider.conversion}`, { waitUntil: "commit" });
});

Then("no visualizo conteos cero ni ausencia de propuestas como si fueran datos recibidos", async function (this: CustomWorld) {
  assert.equal(await this.page.getByTestId("funnel-stage-issued").count(), 0);
  assert.equal(await this.page.getByTestId("funnel-stage-contracted").count(), 0);
  assert.equal(await this.page.getByTestId("uncontracted-proposals").count(), 0);
  assert.equal(await this.page.getByTestId("conversion-requests-section").count(), 0);
  assert.equal((await this.page.locator("main").innerText()).includes("0 %"), false);
});

Given("que la consulta de un rango seleccionado falló", async function (this: CustomWorld) {
  await this.setSession("provider");
  await this.stubGet("/providers/me/statistics/conversion", aConversionResponse());
  const params = new URLSearchParams({ from: "2026-06-01T00:00:00-03:00", to: "2026-07-01T00:00:00-03:00" });
  await this.stubGet(`/providers/me/statistics/conversion?${params}`, { error: "Service unavailable" }, 503);
  await this.page.goto(`${this.appUrl}${ROUTES.provider.conversion}`);
  await this.page.getByLabel("Desde", { exact: true }).fill("2026-06-01");
  await this.page.getByLabel("Hasta (incluido)").fill("2026-06-30");
  await this.page.getByRole("button", { name: "Aplicar filtros" }).click();
});

Given("visualizo un error seguro y el rango que no pudo consultarse", async function (this: CustomWorld) {
  const alert = this.page.locator("main").getByRole("alert");
  await alert.waitFor({ state: "visible" });
  await assertText(alert, t.providerConversion.error);
  const failedRange = this.page.getByTestId("conversion-failed-range");
  await failedRange.waitFor({ state: "visible" });
  await assertText(failedRange, "1/6/26", "1/7/26");
});

Then("visualizo la respuesta del mismo rango solicitado", async function (this: CustomWorld) {
  const issued = this.page.getByTestId("funnel-stage-issued");
  await issued.getByText("20", { exact: true }).waitFor({ state: "visible" });
  await assertText(issued, "20");
  await assertText(this.page.getByTestId("funnel-stage-contracted"), "12");
  await assertText(this.page.getByTestId("conversion-period"), "1/6/26", "1/7/26");
});

Then("el error no se presenta como conversión cero", async function (this: CustomWorld) {
  assert.equal(await this.page.locator("main").getByRole("alert").count(), 0);
  assert.equal(await this.page.getByTestId("conversion-failed-range").count(), 0);
  await assertText(this.page.getByTestId("funnel-stage-issued"), "20");
  assert.notEqual((await this.page.getByTestId("funnel-stage-issued").innerText()).trim(), "0");
});
