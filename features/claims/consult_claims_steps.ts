import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { ROUTES } from "../../lib/routes";
import { aJobRequest } from "../support/factories";
import { APP_URL, CustomWorld } from "../support/world";
import { aClaimDetail, aClaimPage, aClaimSummary } from "./claim-fixtures";

const PNG_1X1 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC";

Given("un consumidor o prestador autenticado con reclamos propios", async function(this: CustomWorld) {
  await this.setSession("provider");
  await this.stubGet("/job-requests", []);
  await this.stubGet("/service-proposals", []);
  await this.stubGet("/claims?page=1&limit=20", aClaimPage([aClaimSummary()], 1, 1));
  const resolved = Array.from({ length: 20 }, (_, index) => aClaimSummary({
    id: 321 - index, status: "resolved", review_started_on: "2026-10-19T12:30:00Z", closed_on: "2026-10-19T13:00:00Z",
  }));
  await this.stubGet("/claims?page=1&limit=20&status=resolved", aClaimPage(resolved, 1, 21));
  await this.stubGet("/claims?page=2&limit=20&status=resolved", aClaimPage([
    aClaimSummary({ id: 301, status: "resolved", closed_on: "2026-10-19T13:00:00Z" }),
  ], 2, 21));
  await this.page.goto(APP_URL + ROUTES.provider.claims);
});

When("consulta Mis reclamos con el filtro de estado y la página elegidos", async function(this: CustomWorld) {
  await this.page.getByTestId("claim-list-status").selectOption("resolved");
  await this.page.getByRole("button", { name: "Página siguiente" }).click();
  await this.page.getByRole("heading", { name: "Reclamo #301", exact: true }).waitFor();
});

Then("ve únicamente sus reclamos con motivo, operación, estado y fechas disponibles, ordenados del más reciente al más antiguo, con navegación entre páginas y un mensaje claro cuando no hay resultados.", async function(this: CustomWorld) {
  const list = this.page.getByRole("list", { name: "Historial de reclamos" });
  assert.strictEqual(await list.getByRole("article").count(), 1);
  assert.match(await list.innerText(), /Daño/);
  assert.match(await list.innerText(), /jr-47/);
  assert.match(await list.innerText(), /Estado: Resuelto/);
  assert.strictEqual(await this.page.getByRole("heading", { name: "Reclamo #321", exact: true }).count(), 0);
  assert.strictEqual(await this.page.getByRole("button", { name: "Página anterior" }).isEnabled(), true);
  assert.strictEqual(await this.page.getByRole("button", { name: "Página siguiente" }).isDisabled(), true);
});

Given("un participante con un reclamo propio", async function (this: CustomWorld) {
  await this.setSession("consumer");
  await this.stubGet("/job-requests", []);
  await this.stubGet("/service-proposals", []);
  await this.stubGet(
    "/claims?page=1&limit=20",
    aClaimPage([
      aClaimSummary({
        id: 321,
        status: "resolved",
        review_started_on: "2026-10-20T10:00:00Z",
        closed_on: "2026-10-22T12:00:00Z",
      }),
    ]),
  );
  await this.stubGet(
    "/claims/321",
    aClaimDetail({
      id: 321,
      status: "resolved",
      review_started_on: "2026-10-20T10:00:00Z",
      closed_on: "2026-10-22T12:00:00Z",
      description: "El servicio no se realizó y se dañó la cañería durante la visita.",
      resolution: {
        type: "consumer_favor",
        reasoning: "La evidencia confirma los daños en la cañería.",
        resolved_on: "2026-10-22T12:00:00Z",
        suggested_compensation: {
          amount_minor: 150000,
          currency: "ARS",
          unit: "minor",
        },
      },
    }),
  );
  await this.page.goto(APP_URL + ROUTES.consumer.claims);
});

When("abre el detalle del reclamo", async function (this: CustomWorld) {
  const detailButton = this.page.getByRole("button", { name: "Ver detalle del reclamo #321" });
  await detailButton.waitFor({ state: "visible" });
  await detailButton.click();
  await this.page.getByRole("dialog", { name: "Detalle del reclamo #321" }).waitFor({ state: "visible" });
});

Then(
  "ve su testimonio, motivo, operación, estado y fechas registradas, además del dictamen si existe o la indicación de que aún no hay resolución; cualquier compensación se informa como sugerida, sin afirmar que fue pagada.",
  async function (this: CustomWorld) {
    const dialog = this.page.getByRole("dialog", { name: "Detalle del reclamo #321" });
    const content = dialog.getByTestId("claim-detail-content");
    await content.waitFor({ state: "visible" });

    const text = await content.innerText();
    assert.match(text, /El servicio no se realizó/i);
    assert.match(text, /Daño/i);
    assert.match(text, /jr-47/i);
    assert.match(text, /Estado: Resuelto/i);
    assert.match(text, /Dictamen/i);
    assert.match(text, /A favor del consumidor/i);
    assert.match(text, /La evidencia confirma los daños/i);
    assert.match(text, /Compensación sugerida/i);
    assert.match(text, /1\.500,00/);
    assert.ok(!/fue pagad[ao]|pagada|pagado/i.test(text));
  },
);

Given("un participante con un reclamo propio que tiene imágenes adjuntas", async function (this: CustomWorld) {
  await this.setSession("consumer");
  await this.stubGet("/job-requests", []);
  await this.stubGet("/service-proposals", []);
  await this.stubGet(
    "/claims?page=1&limit=20",
    aClaimPage([aClaimSummary({ id: 322 })]),
  );
  await this.stubGet(
    "/claims/322",
    aClaimDetail({
      id: 322,
      images: [{ file_id: "550e8400-e29b-41d4-a716-446655440099", url: "https://mock-image.test/claim-evidence-expired.png" }],
    }),
  );

  await this.page.route("https://mock-image.test/claim-evidence-expired.png", async (route) => {
    await route.fulfill({ status: 403, body: "Expired URL" });
  });

  await this.page.route("https://mock-image.test/claim-evidence-renewed.png", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      headers: { "Content-Type": "image/png" },
      body: Buffer.from(PNG_1X1, "base64"),
    });
  });

  await this.page.goto(APP_URL + ROUTES.consumer.claims);
});

When("consulta la evidencia en el detalle", async function (this: CustomWorld) {
  const detailButton = this.page.getByRole("button", { name: "Ver detalle del reclamo #322" });
  await detailButton.waitFor({ state: "visible" });
  await detailButton.click();
  await this.page.getByRole("dialog", { name: "Detalle del reclamo #322" }).waitFor({ state: "visible" });
});

Then(
  "puede visualizar exclusivamente las imágenes vinculadas mediante acceso temporal privado y dispone de un reintento si una imagen deja de estar disponible, sin perder la evidencia del expediente.",
  async function (this: CustomWorld) {
    const renewButton = this.page.getByRole("button", { name: "Renovar acceso" });
    await renewButton.waitFor({ state: "visible" });

    await this.stubGet(
      "/claims/322",
      aClaimDetail({
        id: 322,
        images: [{ file_id: "550e8400-e29b-41d4-a716-446655440099", url: "https://mock-image.test/claim-evidence-renewed.png" }],
      }),
    );

    await renewButton.click();

    const image = this.page.getByRole("img", { name: "Imagen de evidencia 1" });
    await image.waitFor({ state: "visible" });

    assert.strictEqual(await image.getAttribute("src"), "https://mock-image.test/claim-evidence-renewed.png");
    assert.strictEqual(await image.getAttribute("referrerpolicy"), "no-referrer");

    assert.strictEqual(await this.page.getByRole("link").count(), 0);
    const content = this.page.getByTestId("claim-detail-content");
    assert.match(await content.innerText(), /El servicio no se realizó/i);
  },
);

Given(
  "una persona sin sesión válida, sin cuenta habilitada o que intenta acceder a un reclamo o referencia inexistente o ajeno",
  async function (this: CustomWorld) {
    await this.setSession("consumer");
    await this.stubGet("/job-requests", []);
    await this.stubGet("/service-proposals", []);
    await this.stubGet("/claims?page=1&limit=20", aClaimPage([aClaimSummary({ id: 999 })]));
    await this.stubGet("/claims/999", { error: "claim not found" }, 404);
  },
);

When("intenta presentar o consultar el reclamo", async function (this: CustomWorld) {
  await this.page.goto(APP_URL + ROUTES.consumer.claims);
  const detailButton = this.page.getByRole("button", { name: "Ver detalle del reclamo #999" });
  await detailButton.waitFor({ state: "visible" });
  await detailButton.click();
  await this.page.getByRole("dialog", { name: "Detalle del reclamo #999" }).waitFor({ state: "visible" });
});

Then(
  "recibe la indicación de autenticarse, la falta de habilitación o un mensaje de recurso no disponible según corresponda, sin acceder a información privada ni evidencia de otra persona.",
  async function (this: CustomWorld) {
    const dialog = this.page.getByRole("dialog", { name: "Detalle del reclamo #999" });
    const alert = dialog.getByTestId("claim-detail-error");
    await alert.waitFor({ state: "visible" });

    const message = await alert.innerText();
    assert.match(message, /No pudimos encontrar ese reclamo|ya no esté disponible/);
    assert.strictEqual(await dialog.getByRole("img").count(), 0);
    assert.strictEqual(await dialog.getByRole("link").count(), 0);
  },
);

Given(
  "un participante que está presentando un reclamo o consultando el listado o detalle y el servicio demora o falla",
  async function (this: CustomWorld) {
    await this.setSession("consumer");
    await this.stubGet("/job-requests", []);
    await this.stubGet("/service-proposals", []);
    await this.stubGet("/claims?page=1&limit=20", { error: "Internal Server Error" }, 500);

    await this.page.goto(APP_URL + ROUTES.consumer.claims);
  },
);

When("consulta el resultado de su acción", async function (this: CustomWorld) {
  const alert = this.page.getByTestId("claim-list-error");
  await alert.waitFor({ state: "visible" });
});

Then(
  "ve un estado de carga mientras espera o un mensaje de error con una acción de recuperación si falla, sin confundir el fallo con un éxito o con la ausencia de reclamos.",
  async function (this: CustomWorld) {
    const alert = this.page.getByTestId("claim-list-error");
    assert.match(await alert.innerText(), /No pudimos cargar tus reclamos/);

    assert.strictEqual(await this.page.getByText("No tenés reclamos para los filtros elegidos.").count(), 0);
    assert.strictEqual(await this.page.getByTestId("claim-confirmation").count(), 0);

    await this.stubGet("/claims?page=1&limit=20", aClaimPage([aClaimSummary({ id: 321 })]));

    const retryButton = this.page.getByRole("button", { name: "Reintentar" });
    await retryButton.waitFor({ state: "visible" });
    await retryButton.click();

    await this.page.getByRole("heading", { name: "Reclamo #321", exact: true }).waitFor({ state: "visible" });
  },
);

Given(
  "un participante que usa un móvil, tablet o escritorio, o navega con teclado",
  async function (this: CustomWorld) {
    await this.setSession("consumer");
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.stubGet("/job-requests", [
      aJobRequest({
        id: 47,
        title: "Reparación de cañería",
        status: "pending",
        consumer: { id: 10, name: "Ana", surname: "Pérez" },
      }),
    ]);
    await this.stubGet("/service-proposals", []);
    await this.stubGet("/claims?page=1&limit=20", aClaimPage([aClaimSummary({ id: 321 })]));
    await this.stubGet("/claims/321", aClaimDetail({ id: 321 }));
    await this.page.goto(APP_URL + ROUTES.consumer.claims);
  },
);

When("recorre el flujo de presentación y consulta de reclamos", async function (this: CustomWorld) {
  await this.page.getByRole("region", { name: "Historial de reclamos" }).waitFor({ state: "visible" });
  const startClaim = this.page.getByRole("button", { name: "Iniciar reclamo" });
  await startClaim.waitFor({ state: "visible" });
  assert.strictEqual(await this.page.getByTestId("claim-submit").isVisible(), false);
  await startClaim.click();
  await this.page.getByTestId("claim-submit").waitFor({ state: "visible" });
  await this.page.getByTestId("claim-submit").click();
  const focusedElementId = await this.page.evaluate(() => document.activeElement?.id);
  assert.strictEqual(focusedElementId, "claim-reference");

  const detailButton = this.page.getByRole("button", { name: "Ver detalle del reclamo #321" });
  await detailButton.click();

  const dialog = this.page.getByRole("dialog", { name: "Detalle del reclamo #321" });
  await dialog.waitFor({ state: "visible" });

  await this.page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
});

Then(
  "puede completar las acciones, leer el contenido y reconocer errores y estados con controles etiquetados, foco visible y una presentación adaptada a su pantalla.",
  async function (this: CustomWorld) {
    await this.page.waitForFunction(
      () => document.activeElement?.getAttribute("aria-label") === "Ver detalle del reclamo #321",
      { timeout: 5000 },
    );
    const focusedLabel = await this.page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    assert.strictEqual(focusedLabel, "Ver detalle del reclamo #321");

    for (const width of [375, 768, 1280]) {
      await this.page.setViewportSize({ width, height: 720 });
      const fitsViewport = await this.page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      );
      assert.ok(fitsViewport, `Se detectó desborde horizontal en viewport de ${width}px`);
    }

    await this.page.setViewportSize({ width: 1280, height: 720 });
  },
);

