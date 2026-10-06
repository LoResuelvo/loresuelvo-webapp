import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import type { Locator } from "playwright";
import { CustomWorld } from "../support/world";
import { ROUTES } from "../../lib/routes";
import { aConversionResponse, aFilteredConversionResponse } from "../support/conversion-factory";
import { t } from "../../infrastructure/i18n/translations";

async function assertText(locator: Locator, text: string) {
  await locator.waitFor({ state: "visible" });
  assert.ok((await locator.innerText()).includes(text));
}

Given("que soy un prestador autenticado con propuestas y avances informados por la API", async function (this: CustomWorld) {
  await this.setSession("provider");
  await this.stubGet("/providers/me/statistics/conversion", aConversionResponse());
});

Given("algunas propuestas del período alcanzaron etapas después de su fecha de fin", async function (this: CustomWorld) {
  assert.ok(await this.hasApiStub("GET", "/providers/me/statistics/conversion"));
});

When("accedo a Conversión desde Mi desempeño", async function (this: CustomWorld) {
  await this.page.goto(`${this.appUrl}${ROUTES.provider.conversion}`);
});

Then("visualizo emitidas, contratadas, con finalización informada y con pago completo de esa cohorte", async function (this: CustomWorld) {
  const issued = this.page.getByTestId("funnel-stage-issued");
  await issued.waitFor({ state: "visible" });
  await assertText(issued, t.providerConversion.issued);
  await assertText(issued, "10");

  const contracted = this.page.getByTestId("funnel-stage-contracted");
  await contracted.waitFor({ state: "visible" });
  await assertText(contracted, t.providerConversion.contracted);
  await assertText(contracted, "6");

  const reported = this.page.getByTestId("funnel-stage-reported");
  await reported.waitFor({ state: "visible" });
  await assertText(reported, t.providerConversion.reported);
  await assertText(reported, "4");

  const paid = this.page.getByTestId("funnel-stage-paid");
  await paid.waitFor({ state: "visible" });
  await assertText(paid, t.providerConversion.paid);
  await assertText(paid, "2");
});

Then("visualizo las tasas sobre la cohorte y la etapa anterior con sus denominadores", async function (this: CustomWorld) {
  const contracted = this.page.getByTestId("funnel-stage-contracted");
  await assertText(contracted, t.providerConversion.cohortRate);
  await assertText(contracted, "6 de 10 emitidas (60 %)");
  await assertText(contracted, t.providerConversion.previousStageRate);
  await assertText(contracted, "6 de 10 emitidas (60 %)");

  const reported = this.page.getByTestId("funnel-stage-reported");
  await assertText(reported, t.providerConversion.cohortRate);
  await assertText(reported, "4 de 10 emitidas (40 %)");
  await assertText(reported, t.providerConversion.previousStageRate);
  await assertText(reported, "4 de 6 contratadas (66,67 %)");

  const paid = this.page.getByTestId("funnel-stage-paid");
  await paid.waitFor({ state: "visible" });
  await assertText(paid, t.providerConversion.cohortRate);
  await assertText(paid, "2 de 10 emitidas (20 %)");
  await assertText(paid, t.providerConversion.previousStageRate);
  await assertText(paid, "2 de 4 con finalización informada (50 %)");
});

Then("visualizo las propuestas sin contratación observada sin llamarlas rechazadas o perdidas", async function (this: CustomWorld) {
  const uncontracted = this.page.getByTestId("uncontracted-proposals");
  await uncontracted.waitFor({ state: "visible" });
  await assertText(uncontracted, t.providerConversion.uncontracted);
  await assertText(uncontracted, "4");

  const mainText = await this.page.locator("main").innerText();
  assert.equal(/rechazada|rechazadas|perdida|perdidas/i.test(mainText), false);
});

Then("visualizo el período efectivo y el instante de observación informados", async function (this: CustomWorld) {
  const period = this.page.getByTestId("conversion-period");
  await period.waitFor({ state: "visible" });
  await assertText(period, "1/8/26");
  await assertText(period, "31/8/26");

  const observed = this.page.getByTestId("conversion-observed-at");
  await observed.waitFor({ state: "visible" });
  await assertText(observed, t.providerConversion.observedAt);
  await assertText(observed, "15/9/26");
});

Then("se explica que los resultados pueden cambiar cuando las propuestas avanzan", async function (this: CustomWorld) {
  await this.page.getByText(t.providerConversion.cohortHelp, { exact: true }).waitFor({ state: "visible" });
});

Given("que estoy consultando Conversión con un rango inicial", async function (this: CustomWorld) {
  await this.setSession("provider");
  await this.stubGet("/providers/me/statistics/conversion", aConversionResponse());
  await this.page.goto(`${this.appUrl}${ROUTES.provider.conversion}`);
  const period = this.page.getByTestId("conversion-period");
  await period.waitFor({ state: "visible" });
  await assertText(period, "1/8/26");
  await assertText(period, "31/8/26");
});

Given("seleccioné un rango válido de fechas de creación", async function (this: CustomWorld) {
  const params = new URLSearchParams({
    from: "2026-06-01T00:00:00-03:00",
    to: "2026-07-01T00:00:00-03:00",
  });
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

  const contracted = this.page.getByTestId("funnel-stage-contracted");
  await contracted.getByText("12", { exact: true }).waitFor({ state: "visible" });
  await assertText(contracted, "12");

  const reported = this.page.getByTestId("funnel-stage-reported");
  await reported.getByText("8", { exact: true }).waitFor({ state: "visible" });
  await assertText(reported, "8");

  const paid = this.page.getByTestId("funnel-stage-paid");
  await paid.getByText("4", { exact: true }).waitFor({ state: "visible" });
  await assertText(paid, "4");

  const uncontracted = this.page.getByTestId("uncontracted-proposals");
  await uncontracted.getByText("8", { exact: true }).waitFor({ state: "visible" });
  await assertText(uncontracted, "8");
});

Then("el período visible corresponde a la respuesta consultada", async function (this: CustomWorld) {
  const period = this.page.getByTestId("conversion-period");
  await period.waitFor({ state: "visible" });
  await assertText(period, "1/6/26");
  await assertText(period, "1/7/26");
});

Then("no dispongo de agrupación, comparación ni evolución temporal", async function (this: CustomWorld) {
  assert.equal(await this.page.getByLabel("Agrupación").count(), 0);
  assert.equal(await this.page.getByRole("checkbox", { name: /comparar/i }).count(), 0);
  assert.equal(await this.page.getByRole("table").count(), 0);
  assert.equal(await this.page.getByText("Evolución cronológica").count(), 0);
});
