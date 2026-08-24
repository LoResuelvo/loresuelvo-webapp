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
    const stars = this.page
      .locator("section[aria-labelledby='provider-rating-title'] [aria-hidden='true']")
      .first();
    await stars.waitFor({ state: "visible" });
    assert.strictEqual(await stars.getAttribute("aria-hidden"), "true");
  },
);

Given(
  "que el perfil público de {string} incluye el trabajo pagado {string} con reporte y reseña",
  async function (this: CustomWorld, providerName: string, workDescription: string) {
    const [name, ...surnameParts] = providerName.trim().split(/\s+/);
    await this.stubGet(
      "/providers/1",
      aProviderProfile({
        name,
        surname: surnameParts.join(" "),
        work_orders: [
          {
            id: 10,
            scheduled_on: "2026-08-20T10:00:00Z",
            description: workDescription,
            status: "paid",
            completion_report: {
              description: "Trabajo finalizado correctamente y verificado.",
              reported_on: "2026-08-20T12:00:00Z",
            },
            review: {
              rating: 5,
              description: "Excelente servicio, muy puntual y prolijo.",
            },
          },
        ],
      }),
    );
  },
);

Then(
  "visualizo el trabajo {string}",
  async function (this: CustomWorld, workDescription: string) {
    const work = this.page.getByText(workDescription, { exact: true });
    await work.waitFor({ state: "visible" });
    assert.ok(await work.isVisible());
  },
);

Then(
  "visualizo su reporte de finalización",
  async function (this: CustomWorld) {
    const report = this.page.getByRole("heading", { name: /reporte de finalización/i });
    await report.waitFor({ state: "visible" });
    assert.ok(await report.isVisible());
  },
);

Then(
  "visualizo su reseña y calificación",
  async function (this: CustomWorld) {
    const review = this.page.getByRole("heading", { name: /reseña del consumidor/i });
    await review.waitFor({ state: "visible" });
    assert.ok(await review.isVisible());
    const rating = this.page.getByText(/calificación: 5\.0/i);
    await rating.waitFor({ state: "visible" });
    assert.ok(await rating.isVisible());
  },
);

Given(
  "que el perfil público de {string} incluye un trabajo pagado sin reseña",
  async function (this: CustomWorld, providerName: string) {
    const [name, ...surnameParts] = providerName.trim().split(/\s+/);
    await this.stubGet(
      "/providers/1",
      aProviderProfile({
        name,
        surname: surnameParts.join(" "),
        work_orders: [
          {
            id: 10,
            scheduled_on: "2026-08-20T10:00:00Z",
            description: "Reparación de cañería en cocina",
            status: "paid",
            completion_report: {
              description: "Trabajo finalizado correctamente y verificado.",
              reported_on: "2026-08-20T12:00:00Z",
            },
          },
        ],
      }),
    );
  },
);

Then(
  "visualizo que el trabajo todavía no tiene reseña",
  async function (this: CustomWorld) {
    const emptyReview = this.page.getByText("Este trabajo todavía no tiene reseña.", { exact: true });
    await emptyReview.waitFor({ state: "visible" });
    assert.ok(await emptyReview.isVisible());
  },
);

Given(
  "que el perfil público de {string} no tiene trabajos pagados",
  async function (this: CustomWorld, providerName: string) {
    const [name, ...surnameParts] = providerName.trim().split(/\s+/);
    await this.stubGet(
      "/providers/1",
      aProviderProfile({
        name,
        surname: surnameParts.join(" "),
        work_orders: [],
      }),
    );
  },
);

Then(
  "visualizo que todavía no tiene historial público",
  async function (this: CustomWorld) {
    const emptyHistory = this.page.getByText(
      "Este prestador todavía no tiene historial público.",
      { exact: true },
    );
    await emptyHistory.waitFor({ state: "visible" });
    assert.ok(await emptyHistory.isVisible());
  },
);

Given(
  "que el perfil público de {string} incluye los trabajos pagados {string} y {string} en ese orden",
  async function (this: CustomWorld, providerName: string, firstDescription: string, secondDescription: string) {
    const [name, ...surnameParts] = providerName.trim().split(/\s+/);
    const workOrder = (id: number, description: string) => ({
      id,
      scheduled_on: `2026-08-${19 + id}T10:00:00Z`,
      description,
      status: "paid" as const,
      completion_report: {
        description: "Trabajo finalizado correctamente.",
        reported_on: `2026-08-${19 + id}T12:00:00Z`,
      },
    });

    await this.stubGet(
      "/providers/1",
      aProviderProfile({
        name,
        surname: surnameParts.join(" "),
        work_orders: [workOrder(1, firstDescription), workOrder(2, secondDescription)],
      }),
    );
  },
);

Then(
  "visualizo {string} antes que {string}",
  async function (this: CustomWorld, firstDescription: string, secondDescription: string) {
    const headings = await this.page.getByRole("heading", { level: 3 }).allTextContents();
    assert.ok(headings.indexOf(firstDescription) >= 0);
    assert.ok(headings.indexOf(secondDescription) >= 0);
    assert.ok(headings.indexOf(firstDescription) < headings.indexOf(secondDescription));
  },
);
