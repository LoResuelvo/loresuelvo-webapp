import { Given, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld } from "../support/world";
import { aProviderProfile } from "../support/factories";

Given(
  "que el perfil público de {string} está disponible con promedio de {float} y {int} reseñas",
  async function (this: CustomWorld, providerName: string, ratingAverage: number, ratingCount: number) {
    const [name, ...surnameParts] = providerName.trim().split(/\s+/);
    await this.stubGet(
      "/providers/1",
      aProviderProfile({
        name,
        surname: surnameParts.join(" "),
        rating_average: ratingAverage,
        rating_count: ratingCount,
      }),
    );
  },
);

Then(
  "visualizo el promedio de calificación {string}",
  async function (this: CustomWorld, rating: string) {
    const ratingValue = this.page.getByText(rating, { exact: true });
    await ratingValue.waitFor({ state: "visible" });
    assert.ok(await ratingValue.isVisible());
  },
);

Then(
  "visualizo la cantidad de reseñas {string}",
  async function (this: CustomWorld, reviews: string) {
    const reviewCount = this.page.getByText(`(${reviews})`, { exact: true });
    await reviewCount.waitFor({ state: "visible" });
    assert.ok(await reviewCount.isVisible());
  },
);

Then(
  "visualizo las estrellas de la calificación de forma decorativa",
  async function (this: CustomWorld) {
    const stars = this.page.locator("section[aria-labelledby='provider-rating-title'] [aria-hidden='true']");
    await stars.waitFor({ state: "visible" });
    assert.strictEqual(await stars.getAttribute("aria-hidden"), "true");
  },
);
