import { Given, Then, When } from "@cucumber/cucumber";
import assert from "assert";
import { ROUTES } from "../../lib/routes";
import { aCategory, aProviderSearchResult } from "../support/factories";
import { APP_URL, CustomWorld } from "../support/world";

const CATEGORY_ID = 1;

async function stubProviderSearch(world: CustomWorld, providers: ReturnType<typeof aProviderSearchResult>[]) {
  await world.setSession("consumer");
  await world.stubGet("/categories", [aCategory({ id: CATEGORY_ID, name: "Plomería" })]);
  await world.stubGet(`/providers?category_id=${CATEGORY_ID}`, providers);
}

function providerCard(world: CustomWorld, providerName: string) {
  return world.page.locator(".provider-card").filter({ hasText: providerName }).first();
}

Given(
  "que la búsqueda de {string} incluye al prestador {string} sin reseñas",
  async function (this: CustomWorld, _categoryName: string, providerName: string) {
    const [name, ...surnameParts] = providerName.split(" ");
    await stubProviderSearch(this, [
      aProviderSearchResult({
        name,
        surname: surnameParts.join(" "),
        rating_average: 0,
        rating_count: 0,
      }),
    ]);
  },
);

Given(
  "que la búsqueda de {string} incluye al prestador {string} con promedio {float} y {int} reseñas",
  async function (this: CustomWorld, _categoryName: string, providerName: string, rating: number, reviews: number) {
    const [name, ...surnameParts] = providerName.split(" ");
    await stubProviderSearch(this, [
      aProviderSearchResult({
        name,
        surname: surnameParts.join(" "),
        rating_average: rating,
        rating_count: reviews,
      }),
    ]);
  },
);

Given(
  "que la búsqueda de {string} incluye a {string} con promedio {float} y a {string} con promedio {float}",
  async function (
    this: CustomWorld,
    _categoryName: string,
    firstProviderName: string,
    firstRating: number,
    secondProviderName: string,
    secondRating: number,
  ) {
    const [firstName, ...firstSurnameParts] = firstProviderName.split(" ");
    const [secondName, ...secondSurnameParts] = secondProviderName.split(" ");

    await stubProviderSearch(this, [
      aProviderSearchResult({
        id: 1,
        name: firstName,
        surname: firstSurnameParts.join(" "),
        rating_average: firstRating,
        rating_count: 1,
      }),
      aProviderSearchResult({
        id: 2,
        name: secondName,
        surname: secondSurnameParts.join(" "),
        rating_average: secondRating,
        rating_count: 1,
      }),
    ]);
  },
);

When(
  "ingreso a los resultados de prestadores de {string}",
  async function (this: CustomWorld, _categoryName: string) {
    await this.page.goto(`${APP_URL}${ROUTES.consumer.buscar}?category_id=${CATEGORY_ID}`);
    await this.page.waitForLoadState("networkidle");
  },
);

Then(
  "visualizo que {string} tiene {int} reseñas",
  async function (this: CustomWorld, providerName: string, reviews: number) {
    const card = providerCard(this, providerName);
    await card.waitFor({ state: "visible" });
    const expectedLabel = reviews === 1 ? `(${reviews} reseña)` : `(${reviews} reseñas)`;
    const reviewsText = card.getByText(expectedLabel, { exact: true });
    await reviewsText.waitFor({ state: "visible" });
    assert.ok(await reviewsText.isVisible(), `No se ve la cantidad de reseñas de ${providerName}`);
  },
);

async function assertRating(this: CustomWorld, providerName: string, rating: number) {
  const card = providerCard(this, providerName);
  await card.waitFor({ state: "visible" });
  const ratingText = card.getByText(new RegExp(`^${rating}(?:\\.0)?$`)).first();
  await ratingText.waitFor({ state: "visible" });
  assert.ok(await ratingText.isVisible(), `No se ve la calificación ${rating} de ${providerName}`);
}

Then(
  "visualizo la calificación promedio {float} de {string}",
  async function (this: CustomWorld, rating: number, providerName: string) {
    await assertRating.call(this, providerName, rating);
  },
);

Then(
  "visualizo la calificación {float} en la tarjeta de {string}",
  async function (this: CustomWorld, rating: number, providerName: string) {
    await assertRating.call(this, providerName, rating);
  },
);
