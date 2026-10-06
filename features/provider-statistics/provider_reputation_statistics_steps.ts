import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import type { Locator } from "playwright";
import { CustomWorld } from "../support/world";
import { ROUTES } from "../../lib/routes";
import { aReputationResponse, aReputationWithEmptyReview } from "../support/reputation-factory";
import { t } from "../../infrastructure/i18n/translations";

async function assertText(locator: Locator, text: string) {
  await locator.waitFor({ state: "visible" });
  assert.ok((await locator.innerText()).includes(text));
}

Given("que soy un prestador autenticado con trabajos pagados y reseñas", async function (this: CustomWorld) {
  await this.setSession("provider");
});

Given("la API informa mi promedio, distribución de cinco estrellas y cobertura global", async function (this: CustomWorld) {
  await this.stubGet("/providers/me/statistics/reputation", aReputationResponse());
});

When("accedo a Reputación desde Mi desempeño", async function (this: CustomWorld) {
  await this.page.goto(`${this.appUrl}${ROUTES.provider.reputation}`);
});

Then("visualizo el promedio, la cantidad de reseñas y la distribución informados", async function (this: CustomWorld) {
  const container = this.page.getByTestId("reputation-indicators");
  await container.waitFor({ state: "visible" });
  await assertText(container, "4,8");
  await assertText(container, "5");
  const distribution = this.page.getByTestId("rating-distribution");
  await distribution.waitFor({ state: "visible" });
  await assertText(distribution, "5");
  await assertText(distribution, "4");
  await assertText(distribution, "1");
});

Then("visualizo los trabajos pagados elegibles, los que tienen reseña y su cobertura", async function (this: CustomWorld) {
  const coverageSection = this.page.getByTestId("reputation-coverage");
  await coverageSection.waitFor({ state: "visible" });
  await assertText(coverageSection, "6");
  await assertText(coverageSection, "5");
  await assertText(coverageSection, "83,33 %");
});

Then("se explica qué trabajos forman el denominador de la cobertura", async function (this: CustomWorld) {
  await this.page.getByText(t.providerReputation.denominatorExplanation, { exact: true }).waitFor({ state: "visible" });
});

Then("no dispongo de filtros temporales ni comparación entre períodos", async function (this: CustomWorld) {
  assert.equal(await this.page.getByLabel("Desde").count(), 0);
  assert.equal(await this.page.getByLabel("Hasta (incluido)").count(), 0);
  assert.equal(await this.page.getByLabel("Agrupación").count(), 0);
  assert.equal(await this.page.getByRole("checkbox", { name: /comparar/i }).count(), 0);
  assert.equal(await this.page.getByRole("table", { name: /comparación/i }).count(), 0);
});

Given("que estoy consultando mi reputación", async function (this: CustomWorld) {
  await this.setSession("provider");
});

Given("la API incluye una reseña con calificación y descripción vacía", async function (this: CustomWorld) {
  await this.stubGet("/providers/me/statistics/reputation", aReputationWithEmptyReview());
});

When("se muestra la página de reseñas", async function (this: CustomWorld) {
  await this.page.goto(`${this.appUrl}${ROUTES.provider.reputation}`);
});

Then("visualizo su calificación sin un comentario inventado", async function (this: CustomWorld) {
  const card = this.page.locator('[data-testid="review-card"][data-work-order-id="101"]');
  await card.waitFor({ state: "visible" });
  await assertText(card, "5");
  assert.equal(await card.getByTestId("review-description").count(), 0);
});

Then("esa reseña permanece incluida en los indicadores informados por la API", async function (this: CustomWorld) {
  const container = this.page.getByTestId("reputation-indicators");
  await container.waitFor({ state: "visible" });
  await assertText(container, "4,8");
  await assertText(container, "5");
});
