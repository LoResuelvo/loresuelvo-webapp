import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import type { Locator } from "playwright";
import { CustomWorld } from "../support/world";
import { ROUTES } from "../../lib/routes";
import {
  aReputationResponse,
  aReputationWithEmptyReview,
  aPaginatedReputationFirstPage,
  aPaginatedReputationSecondPage,
  aReputationWithoutNextCursor,
  anEmptyReputationResponse,
} from "../support/reputation-factory";
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

Given("que estoy viendo una página de mis reseñas con una continuación disponible", async function (this: CustomWorld) {
  await this.setSession("provider");
  await this.stubGet("/providers/me/statistics/reputation", aPaginatedReputationFirstPage());
  await this.page.goto(`${this.appUrl}${ROUTES.provider.reputation}`);
});

Given("la API dispone de otra página con indicadores globales", async function (this: CustomWorld) {
  await this.stubGet("/providers/me/statistics/reputation?cursor=page-2", aPaginatedReputationSecondPage());
});

When("selecciono Siguiente página", async function (this: CustomWorld) {
  const nextButton = this.page.getByRole("button", { name: t.providerReputation.nextPage });
  await nextButton.waitFor({ state: "visible" });
  await nextButton.click();
});

Then("visualizo la nueva página en el orden informado por la API", async function (this: CustomWorld) {
  const card108 = this.page.locator('[data-testid="review-card"][data-work-order-id="108"]');
  const card107 = this.page.locator('[data-testid="review-card"][data-work-order-id="107"]');
  await card108.waitFor({ state: "visible" });
  await card107.waitFor({ state: "visible" });

  assert.equal(await this.page.locator('[data-testid="review-card"][data-work-order-id="110"]').count(), 0);
  assert.equal(await this.page.locator('[data-testid="review-card"][data-work-order-id="109"]').count(), 0);

  const cards = this.page.getByTestId("review-card");
  assert.equal(await cards.count(), 2);
  assert.equal(await cards.nth(0).getAttribute("data-work-order-id"), "108");
  assert.equal(await cards.nth(1).getAttribute("data-work-order-id"), "107");
});

Then("los indicadores corresponden a la respuesta global de esa página", async function (this: CustomWorld) {
  const container = this.page.getByTestId("reputation-indicators");
  await container.waitFor({ state: "visible" });
  await assertText(container, "4,8");
  await assertText(container, "5");
});

Then("no se calculan a partir de las reseñas visibles ni se presenta el orden como recencia", async function (this: CustomWorld) {
  const container = this.page.getByTestId("reputation-indicators");
  await assertText(container, "4,8");
  await assertText(container, "5");
  assert.equal(await this.page.getByText(/recientes/i).count(), 0);
});

Given("que la API informa una página de mis reseñas sin continuación", async function (this: CustomWorld) {
  await this.setSession("provider");
  await this.stubGet("/providers/me/statistics/reputation", aReputationWithoutNextCursor());
});

When("consulto esa página", async function (this: CustomWorld) {
  await this.page.goto(`${this.appUrl}${ROUTES.provider.reputation}`);
});

Then("visualizo sus reseñas", async function (this: CustomWorld) {
  const cards = this.page.getByTestId("review-card");
  await cards.first().waitFor({ state: "visible" });
  assert.ok((await cards.count()) > 0);
});

Then("no puedo solicitar una siguiente página", async function (this: CustomWorld) {
  assert.equal(await this.page.getByRole("button", { name: t.providerReputation.nextPage }).count(), 0);
});

Given(/^que soy un prestador autenticado con (trabajos pagados elegibles|ningún trabajo pagado elegible)$/, async function (this: CustomWorld, situacion: string) {
  await this.setSession("provider");
  (this as unknown as { reputationEligibleOrders: number }).reputationEligibleOrders =
    situacion === "trabajos pagados elegibles" ? 3 : 0;
});

Given("no tengo reseñas", async function (this: CustomWorld) {
  const eligible = (this as unknown as { reputationEligibleOrders?: number }).reputationEligibleOrders ?? 0;
  await this.stubGet("/providers/me/statistics/reputation", anEmptyReputationResponse(eligible));
});

When("consulto Reputación", async function (this: CustomWorld) {
  await this.page.goto(`${this.appUrl}${ROUTES.provider.reputation}`);
});

Then("visualizo cantidad de reseñas y distribución en cero", async function (this: CustomWorld) {
  const container = this.page.getByTestId("reputation-indicators");
  await container.waitFor({ state: "visible" });
  await assertText(container, "0");

  const distribution = this.page.getByTestId("rating-distribution");
  await distribution.waitFor({ state: "visible" });
  const counts = await distribution.locator("li span:last-child").allInnerTexts();
  assert.deepEqual(counts, ["0", "0", "0", "0", "0"]);
});

Then("el promedio se muestra como No disponible", async function (this: CustomWorld) {
  const container = this.page.getByTestId("reputation-indicators");
  await container.waitFor({ state: "visible" });
  await assertText(container, t.providerReputation.unavailable);
});

Then(/^la cobertura se muestra como (.+)$/, async function (this: CustomWorld, cobertura: string) {
  const coverageSection = this.page.getByTestId("reputation-coverage");
  await coverageSection.waitFor({ state: "visible" });
  const percentageElement = coverageSection.locator("dd").first();
  if (cobertura === "cero") {
    await assertText(percentageElement, "0 %");
  } else {
    await assertText(percentageElement, t.providerReputation.unavailable);
  }
});

Then("visualizo un mensaje de ausencia de reseñas", async function (this: CustomWorld) {
  await this.page.getByText(t.providerReputation.noReviews, { exact: true }).waitFor({ state: "visible" });
});
