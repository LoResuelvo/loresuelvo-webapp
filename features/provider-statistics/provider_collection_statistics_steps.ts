import { Given, When, Then } from "@cucumber/cucumber";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import type { Locator } from "playwright";
import { createE2EStubCookies } from "../../infrastructure/api/e2e-stubs-utils";
import { CustomWorld } from "../support/world";
import { ROUTES } from "../../lib/routes";
import { aCollectionResponse, aComparedCollectionResponse, aCollectionTransactionsResponse, aNextCollectionTransactionsResponse, anEmptyCollectionResponse, anEmptyCollectionTransactionsResponse } from "../support/collection-factory";
import { t } from "../../infrastructure/i18n/translations";

async function stubInitialCollections(world: CustomWorld) {
  await world.stubGet("/providers/me/statistics/collections", aCollectionResponse());
  const params = new URLSearchParams({ from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00" });
  await world.stubGet(`/providers/me/statistics/collections/transactions?${params}`, aCollectionTransactionsResponse());
}

async function assertText(locator: Locator, text: string) {
  await locator.waitFor({ state: "visible" });
  assert.ok((await locator.innerText()).includes(text));
}

Given("tengo señas y saldos verificados en los últimos 30 días", async function (this: CustomWorld) {
  await stubInitialCollections(this);
});
Given("tengo trabajos programados y finalizados pendientes de saldo", async function (this: CustomWorld) {
  assert.ok(await this.hasApiStub("GET", "/providers/me/statistics/collections"));
});
When("abro la sección Cobros de Mi desempeño", async function (this: CustomWorld) {
  await this.page.goto(`${this.appUrl}${ROUTES.provider.collections}`);
});
Then("veo señas, saldos y total verificados sin comisiones", async function (this: CustomWorld) {
  const results = this.page.getByRole("region", { name: "Cobros verificados del período" });
  await results.waitFor({ state: "visible" });
  assert.deepEqual(await results.locator("dd").allTextContents(), ["$ 12.000,01", "$ 28.000,02", "$ 40.000,03"]);
});
Then("veo su evolución cronológica y el período efectivo", async function (this: CustomWorld) {
  await assertText(this.page.getByTestId("collection-period"), "1/8/26");
  await assertText(this.page.getByTestId("collection-period"), "31/8/26");
  const rows = this.page.getByRole("table", { name: "Evolución de cobros" }).getByRole("row");
  assert.equal(await rows.count(), 31);
  assert.deepEqual(await rows.nth(2).getByRole("cell").allTextContents(), ["$ 0,00", "$ 0,00", "$ 0,00"]);
});
Then("veo por separado cantidades e importes pendientes de trabajos programados y finalizados", async function (this: CustomWorld) {
  assert.deepEqual(await this.page.getByRole("region", { name: "Saldos pendientes actuales" }).locator("dd").allTextContents(), ["3", "$ 30.000,00", "2", "$ 15.000,00"]);
});
Then("la pantalla distingue los cobros verificados del saldo bancario", async function (this: CustomWorld) {
  await this.page.getByText("Importes del prestador, sin comisiones. No representan el saldo de tu cuenta bancaria.").waitFor({ state: "visible" });
});

Given("estoy viendo mis cobros", async function (this: CustomWorld) {
  await stubInitialCollections(this);
  await this.page.goto(`${this.appUrl}${ROUTES.provider.collections}`);
  await this.page.getByRole("region", { name: "Cobros verificados del período" }).waitFor({ state: "visible" });
});
Given("seleccioné un rango válido, agrupación mensual y comparación anterior", async function (this: CustomWorld) {
  const remaining = (await this.getStubs()).filter(stub => !stub.endpoint.startsWith("/providers/me/statistics/collections"));
  await this.context.addCookies(createE2EStubCookies(remaining));
  const params = new URLSearchParams({ from: "2026-08-04T00:00:00-03:00", to: "2026-09-13T00:00:00-03:00", granularity: "month", compare_previous: "true" });
  const compared = aComparedCollectionResponse();
  await this.stubGet(`/providers/me/statistics/collections?${params}`, compared);
  const detailParams = new URLSearchParams({ from: compared.period.from, to: compared.period.to });
  await this.stubGet(`/providers/me/statistics/collections/transactions?${detailParams}`, { ...aCollectionTransactionsResponse(), period: { from: compared.period.from, to: compared.period.to, time_zone: compared.period.time_zone } });
  await this.page.getByLabel("Desde", { exact: true }).fill("2026-08-04");
  await this.page.getByLabel("Hasta (incluido)").fill("2026-09-12");
  await this.page.getByLabel("Agrupación").selectOption("month");
  await this.page.getByLabel("Comparar con el período anterior", { exact: true }).check();
});
Then("veo resumen, evolución y comparación correspondientes al período aplicado", async function (this: CustomWorld) {
  await this.page.waitForFunction(() => document.querySelector('[data-testid="collection-period"]')?.textContent?.includes("4/8/26"));
  await assertText(this.page.getByTestId("collection-period"), "13/9/26");
  const results = this.page.getByRole("region", { name: "Cobros verificados del período" });
  assert.deepEqual(await results.locator("dd").allTextContents(), ["$ 10.000,00", "$ 20.000,00", "$ 30.000,00"]);
  const rows = this.page.getByRole("table", { name: "Evolución de cobros" }).getByRole("row");
  assert.equal(await rows.count(), 3);
  await assertText(rows.nth(1), "1/9/26");
  const comparison = this.page.getByRole("table", { name: "Comparación de cobros" });
  await assertText(comparison, "-50 %");
  await assertText(comparison, "-$ 20.000,00");
  await assertText(this.page.getByRole("region", { name: "Comparación con el período anterior", exact: true }), "25/6/26");
});
Then("los pendientes actuales no se filtran ni comparan con el período anterior", async function (this: CustomWorld) {
  const pending = this.page.getByRole("region", { name: "Saldos pendientes actuales" });
  assert.deepEqual(await pending.locator("dd").allTextContents(), ["3", "$ 30.000,00", "2", "$ 15.000,00"]);
  await assertText(pending, "No están filtrados por el período ni se comparan");
});

Given("estoy viendo el detalle de cobros del período aplicado", async function (this: CustomWorld) {
  await stubInitialCollections(this);
  await this.page.goto(`${this.appUrl}${ROUTES.provider.collections}`);
  await this.page.getByRole("table", { name: "Transacciones verificadas" }).waitFor({ state: "visible" });
});
Given("hay señas y saldos verificados dentro de ese período", async function (this: CustomWorld) {
  const table = this.page.getByRole("table", { name: "Transacciones verificadas" });
  await assertText(table, "Seña");
  await assertText(table, "Saldo");
  const remaining = (await this.getStubs()).filter(stub => !stub.endpoint.startsWith("/providers/me/statistics/collections"));
  await this.context.addCookies(createE2EStubCookies(remaining));
  const params = new URLSearchParams({ from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00", purpose: "booking_deposit" });
  await this.stubGet(`/providers/me/statistics/collections/transactions?${params}`, aCollectionTransactionsResponse("booking_deposit"));
});
When("filtro el detalle por señas", async function (this: CustomWorld) {
  await this.page.getByLabel("Propósito").selectOption("booking_deposit");
});
Then("veo únicamente transacciones de señas con fecha verificada e importe del prestador", async function (this: CustomWorld) {
  const table = this.page.getByRole("table", { name: "Transacciones verificadas" });
  await this.page.waitForFunction(() => document.querySelector('[data-testid="collection-detail-count"]')?.textContent?.includes("23"));
  assert.equal(await table.getByRole("row").count(), 2);
  await assertText(table, "20/8/26");
  await assertText(table, "5.000,01");
  assert.ok(!(await table.innerText()).includes("Saldo"));
});
Then("veo sus referencias comerciales informadas por la API", async function (this: CustomWorld) {
  const table = this.page.getByRole("table", { name: "Transacciones verificadas" });
  await assertText(table, "41");
  await assertText(table, "51");
});
Then("la cantidad y el importe total corresponden a todas las señas del período y no sólo a la página visible", async function (this: CustomWorld) {
  await assertText(this.page.getByTestId("collection-detail-count"), "23");
  await assertText(this.page.getByTestId("collection-detail-amount"), "12.000,01");
  await this.page.getByText("Totales de todas las transacciones del período y propósito. Cada consulta refleja su propia instantánea.").waitFor({ state: "visible" });
  await this.page.getByLabel("Propósito").focus();
  assert.equal(await this.page.getByLabel("Propósito").evaluate(element => element === document.activeElement), true);
  await mkdir(".delivery/runtime/visual", { recursive: true });
  for (const width of [375, 768, 1440]) {
    await this.page.setViewportSize({ width, height: 960 });
    assert.ok(await this.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await this.page.screenshot({ path: `.delivery/runtime/visual/collections-${width}.png`, fullPage: true });
  }
});

Given("estoy viendo una página de transacciones con más resultados", async function (this: CustomWorld) {
  await stubInitialCollections(this);
  const baseParams = new URLSearchParams({ from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00", purpose: "booking_deposit" });
  await this.stubGet(`/providers/me/statistics/collections/transactions?${baseParams}`, aCollectionTransactionsResponse("booking_deposit"));
  const nextParams = new URLSearchParams({ from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00", purpose: "booking_deposit", cursor: "opaque-signed-cursor" });
  await this.stubGet(`/providers/me/statistics/collections/transactions?${nextParams}`, aNextCollectionTransactionsResponse("booking_deposit"));
  await this.page.goto(`${this.appUrl}${ROUTES.provider.collections}`);
  await this.page.getByRole("table", { name: "Transacciones verificadas" }).waitFor({ state: "visible" });
  await this.page.getByLabel("Propósito").selectOption("booking_deposit");
  await this.page.waitForFunction(() => document.querySelector('[data-testid="collection-detail-count"]')?.textContent?.includes("23"));
  await this.page.getByRole("button", { name: "Siguiente página" }).waitFor({ state: "visible" });
});

When("solicito la siguiente página", async function (this: CustomWorld) {
  await this.page.getByRole("button", { name: "Siguiente página" }).click();
});

Then("veo la siguiente página en el orden informado por la API", async function (this: CustomWorld) {
  const table = this.page.getByRole("table", { name: "Transacciones verificadas" });
  await this.page.waitForFunction(() => document.querySelector('table[aria-label="Transacciones verificadas"]')?.textContent?.includes("18/8/26"));
  assert.equal(await table.getByRole("row").count(), 2);
  const rows = table.getByRole("row");
  await assertText(rows.nth(1), "18/8/26");
  await assertText(rows.nth(1), "4.000,00");
  await assertText(rows.nth(1), "43");
  await assertText(rows.nth(1), "53");
  assert.ok(!(await table.innerText()).includes("20/8/26"));
});

Then("se conservan el período efectivo y el filtro de propósito", async function (this: CustomWorld) {
  await assertText(this.page.getByTestId("collection-period"), "1/8/26");
  await assertText(this.page.getByTestId("collection-period"), "31/8/26");
  assert.equal(await this.page.getByLabel("Propósito").inputValue(), "booking_deposit");
});

Then("no se recalcula una ventana móvil de últimos 30 días", async function (this: CustomWorld) {
  const periodText = await this.page.getByTestId("collection-period").innerText();
  assert.ok(periodText.includes("1/8/26") && periodText.includes("31/8/26"));
});

Given("no tengo cobros verificados en el período consultado", async function (this: CustomWorld) {
  await this.stubGet("/providers/me/statistics/collections", anEmptyCollectionResponse());
  const params = new URLSearchParams({ from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00" });
  await this.stubGet(`/providers/me/statistics/collections/transactions?${params}`, anEmptyCollectionTransactionsResponse());
});

Given("mi cuenta de Mercado Pago está desconectada", async function (this: CustomWorld) {
  // Authentication session does not establish Mercado Pago gateway
});

Given("tengo un trabajo finalizado con saldo contractual pendiente", async function (this: CustomWorld) {
  assert.ok(await this.hasApiStub("GET", "/providers/me/statistics/collections"));
});

When("abro mis cobros para ese período", async function (this: CustomWorld) {
  await this.page.goto(`${this.appUrl}${ROUTES.provider.collections}`);
});

Then("veo totales y evolución en cero y un detalle sin transacciones", async function (this: CustomWorld) {
  const results = this.page.getByRole("region", { name: "Cobros verificados del período" });
  await results.waitFor({ state: "visible" });
  assert.deepEqual(await results.locator("dd").allTextContents(), ["$ 0,00", "$ 0,00", "$ 0,00"]);
  const rows = this.page.getByRole("table", { name: "Evolución de cobros" }).getByRole("row");
  assert.equal(await rows.count(), 31);
  assert.deepEqual(await rows.nth(2).getByRole("cell").allTextContents(), ["$ 0,00", "$ 0,00", "$ 0,00"]);
  await this.page.getByText(t.providerCollections.emptyTransactions).waitFor({ state: "visible" });
  assert.equal(await this.page.getByTestId("collection-detail-count").innerText(), "0");
  assert.equal(await this.page.getByTestId("collection-detail-amount").innerText(), "$ 0,00");
});

Then("sigo viendo el saldo pendiente informado por la API", async function (this: CustomWorld) {
  const pending = this.page.getByRole("region", { name: "Saldos pendientes actuales" });
  assert.deepEqual(await pending.locator("dd").allTextContents(), ["0", "$ 0,00", "1", "$ 15.000,00"]);
});

Then("no se me exige conectar Mercado Pago para consultar estos datos", async function (this: CustomWorld) {
  assert.equal(await this.page.getByText(/conect.*mercado pago/i).count(), 0);
  assert.equal(await this.page.getByRole("button", { name: /mercado pago/i }).count(), 0);
  assert.equal(await this.page.getByRole("link", { name: /mercado pago/i }).count(), 0);
});

Given("veo un resumen válido y la consulta del detalle falló", async function (this: CustomWorld) {
  await this.stubGet("/providers/me/statistics/collections", aCollectionResponse());
  const params = new URLSearchParams({ from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00" });
  await this.stubGet(`/providers/me/statistics/collections/transactions?${params}`, { error: "Service unavailable" }, 503);
  await this.page.goto(`${this.appUrl}${ROUTES.provider.collections}`);
  await this.page.getByRole("region", { name: "Cobros verificados del período" }).waitFor({ state: "visible" });
  const alert = this.page.getByRole("alert").filter({ hasText: t.providerCollections.detailError });
  await alert.waitFor({ state: "visible" });
  assert.ok((await alert.innerText()).includes(t.providerCollections.detailError));
  assert.equal(await this.page.getByTestId("collection-detail-count").count(), 0);
  assert.equal(await this.page.getByRole("table", { name: "Transacciones verificadas" }).count(), 0);
  assert.equal(await this.page.getByText(t.providerCollections.emptyTransactions).count(), 0);
});

When("reintento consultar el detalle", async function (this: CustomWorld) {
  await this.page.getByRole("button", { name: "Reintentar" }).click();
});

Then("veo las transacciones de la misma consulta solicitada", async function (this: CustomWorld) {
  const table = this.page.getByRole("table", { name: "Transacciones verificadas" });
  await table.waitFor({ state: "visible" });
  assert.equal(await table.getByRole("row").count(), 3);
  await assertText(table, "20/8/26");
  await assertText(table, "19/8/26");
});

Then("el fallo anterior no se representa como un detalle vacío o un total cero", async function (this: CustomWorld) {
  await assertText(this.page.getByTestId("collection-detail-count"), "30");
  await assertText(this.page.getByTestId("collection-detail-amount"), "40.000,03");
  assert.equal(await this.page.getByText(t.providerCollections.emptyTransactions).count(), 0);
  assert.equal(await this.page.getByText(t.providerCollections.detailError).count(), 0);
});
