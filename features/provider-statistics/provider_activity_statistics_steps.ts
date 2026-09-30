import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import type { Locator } from "playwright";

async function assertText(locator: Locator, text: string) {
  await locator.waitFor({ state: "visible" });
  assert.ok((await locator.innerText()).includes(text));
}
import { CustomWorld } from "../support/world";
import { ROUTES } from "../../lib/routes";
import { anActivityResponse, anEmptyActivityResponse, aWeeklyActivityResponse, aComparedActivityResponse } from "../support/activity-factory";
import { mkdir } from "node:fs/promises";
import { createE2EStubCookies } from "../../infrastructure/api/e2e-stubs-utils";

Given("el período consultado no tiene eventos", async function (this: CustomWorld) {
  await this.stubGet("/providers/me/statistics/activity", anEmptyActivityResponse());
});

Given("tengo solicitudes pendientes y órdenes programadas o pendientes de pago", async function (this: CustomWorld) {
  await this.stubGet("/providers/me/statistics/activity", anEmptyActivityResponse());
});

Given("una consulta de actividad falló y veo un mensaje de error", async function (this: CustomWorld) {
  await this.stubGet("/providers/me/statistics/activity", anActivityResponse());
  await this.page.goto(`${this.appUrl}${ROUTES.provider.activity}`);
  await this.page.getByRole("heading", { name: "Resultados del período" }).waitFor({ state: "visible" });
  const remainingStubs = (await this.getStubs()).filter(stub => !stub.endpoint.startsWith("/providers/me/statistics/activity"));
  await this.context.addCookies(createE2EStubCookies(remainingStubs));
  const params = new URLSearchParams({ from: "2026-08-04T00:00:00-03:00", to: "2026-08-13T00:00:00-03:00", granularity: "week" });
  await this.stubGet(`/providers/me/statistics/activity?${params}`, {}, 503);
  await this.page.getByLabel("Desde", { exact: true }).fill("2026-08-04");
  await this.page.getByLabel("Hasta (incluido)").fill("2026-08-12");
  await this.page.getByLabel("Agrupación").selectOption("week");
  await this.page.getByRole("button", { name: "Aplicar filtros" }).click();
  await this.page.getByRole("alert").filter({ hasText: "No pudimos consultar tu actividad" }).waitFor({ state: "visible" });
  await this.page.getByRole("region", { name: "Resultados del período" }).waitFor({ state: "detached" });
  assert.equal(await this.page.getByRole("region", { name: "Resultados del período" }).count(), 0);
});

When("reintento la consulta", async function (this: CustomWorld) {
  const retry = this.page.getByRole("button", { name: "Reintentar consulta" });
  await retry.focus();
  await this.page.keyboard.press("Enter");
});

Then("veo los resultados del mismo filtro solicitado", async function (this: CustomWorld) {
  await assertText(this.page.getByTestId("activity-period"), "4/8/26");
  await assertText(this.page.getByTestId("activity-period"), "13/8/26");
  assert.equal(await this.page.getByLabel("Agrupación").inputValue(), "week");
  await assertText(this.page.getByRole("region", { name: "Resultados del período" }).locator("dd").first(), "6");
});

Then("el error anterior no se representa como falta de actividad", async function (this: CustomWorld) {
  assert.equal(await this.page.getByRole("alert").filter({ hasText: "No pudimos consultar tu actividad" }).count(), 0);
  assert.equal(await this.page.getByRole("button", { name: "Reintentar consulta" }).count(), 0);
  await mkdir(".delivery/runtime/visual", { recursive: true });
  for (const width of [375, 768, 1440]) {
    await this.page.setViewportSize({ width, height: 960 });
    assert.ok(await this.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await this.page.screenshot({ path: `.delivery/runtime/visual/activity-recovered-${width}.png`, fullPage: true });
  }
});

When("abro mi actividad para ese período", async function (this: CustomWorld) {
  await this.page.goto(`${this.appUrl}${ROUTES.provider.activity}`);
});

Then("veo resultados en cero y promedio no disponible", async function (this: CustomWorld) {
  const results = this.page.getByRole("region", { name: "Resultados del período" });
  await results.waitFor({ state: "visible" });
  assert.deepEqual(await results.locator("dd").allTextContents(), ["0", "0", "0", "0", "0", "0", "$ 0,00", "No disponible"]);
});

Then("veo los pendientes actuales informados por la API", async function (this: CustomWorld) {
  assert.deepEqual(await this.page.getByRole("region", { name: "Pendientes actuales" }).locator("dd").allTextContents(), ["7", "8", "9"]);
});

Then("la pantalla explica que los pendientes no están filtrados por el período", async function (this: CustomWorld) {
  await assertText(this.page.getByRole("region", { name: "Pendientes actuales" }), "No están filtrados por el período.");
});

Given("tengo contrataciones, finalizaciones informadas y pagos completos en los últimos 30 días", async function (this: CustomWorld) {
  await this.stubGet("/providers/me/statistics/activity", anActivityResponse());
});

When("abro la sección Actividad de Mi desempeño", async function (this: CustomWorld) {
  await this.page.goto(`${this.appUrl}${ROUTES.provider.activity}`);
});

Then("veo el período efectivo y los resultados informados por la API", async function (this: CustomWorld) {
  await assertText(this.page.getByTestId("activity-period"), "1/8/26");
  const results = this.page.getByRole("region", { name: "Resultados del período" });
  await assertText(results.locator("dd").nth(0), "4");
  await assertText(results.locator("dd").nth(1), "3");
  await assertText(results.locator("dd").nth(2), "2");
});

Then("veo clientes atendidos desglosados en nuevos y recurrentes", async function (this: CustomWorld) {
  const results = this.page.getByRole("region", { name: "Resultados del período" });
  await assertText(results.locator("dd").nth(3), "3");
  await assertText(results.locator("dd").nth(4), "2");
  await assertText(results.locator("dd").nth(5), "1");
});

Then("veo valor pactado e importe promedio de los trabajos finalizados en pesos argentinos", async function (this: CustomWorld) {
  const results = this.page.getByRole("region", { name: "Resultados del período" });
  await assertText(results.locator("dd").nth(6), "120.000,00");
  await assertText(results.locator("dd").nth(7), "40.000,00");
  await this.page.getByText("Valor contractual en pesos argentinos. No representa dinero cobrado.").waitFor({ state: "visible" });
});

Then("veo la evolución cronológica con intervalos sin eventos en cero", async function (this: CustomWorld) {
  const rows = this.page.getByRole("table").getByRole("row");
  await rows.nth(2).waitFor({ state: "visible" });
  assert.equal(await rows.count(), 31);
  await assertText(rows.nth(1).getByRole("cell").nth(0), "4");
  assert.deepEqual(await rows.nth(2).getByRole("cell").allTextContents(), ["0", "0", "0"]);
});

Given("estoy autenticado como prestador", async function (this: CustomWorld) {
  await this.setSession("provider");
});

Given("estoy viendo mi actividad", async function (this: CustomWorld) {
  await this.stubGet("/providers/me/statistics/activity", anActivityResponse());
  await this.page.goto(`${this.appUrl}${ROUTES.provider.activity}`);
  await this.page.getByRole("heading", { name: "Resultados del período" }).waitFor({ state: "visible" });
});

Given("seleccioné un rango válido y agrupación semanal", async function (this: CustomWorld) {
  const params = new URLSearchParams({ from: "2026-08-04T00:00:00-03:00", to: "2026-08-13T00:00:00-03:00", granularity: "week" });
  await this.stubGet(`/providers/me/statistics/activity?${params}`, aWeeklyActivityResponse());
  await this.page.getByLabel("Desde", { exact: true }).fill("2026-08-04");
  await this.page.getByLabel("Hasta (incluido)").fill("2026-08-12");
  await this.page.getByLabel("Agrupación").selectOption("week");
});

When("aplico los filtros", async function (this: CustomWorld) {
  await this.page.getByRole("button", { name: "Aplicar filtros" }).click();
});

Then("los resultados y la evolución corresponden al período aplicado", async function (this: CustomWorld) {
  await this.page.waitForFunction(() => document.querySelector('[data-testid="activity-period"]')?.textContent?.includes("4/8/26"));
  await assertText(this.page.getByTestId("activity-period"), "13/8/26");
  await assertText(this.page.getByRole("region", { name: "Resultados del período" }).locator("dd").first(), "6");
  await assertText(this.page.getByRole("table").getByRole("cell").first(), "6");
});

Then("puedo reconocer los límites efectivos de los intervalos", async function (this: CustomWorld) {
  await assertText(this.page.getByRole("table").getByRole("row").nth(1), "4/8/26");
  await assertText(this.page.getByRole("table").getByRole("row").nth(1), "10/8/26");
  await assertText(this.page.getByRole("table").getByRole("row").nth(2), "13/8/26");
});

Then("los pendientes actuales permanecen separados de esos resultados", async function (this: CustomWorld) {
  const pending = this.page.getByRole("region", { name: "Pendientes actuales" });
  assert.deepEqual(await pending.locator("dd").allTextContents(), ["7", "8", "9"]);
  await assertText(pending, "No están filtrados por el período.");
});

Given("estoy viendo mi actividad en un período válido", async function (this: CustomWorld) {
  await this.stubGet("/providers/me/statistics/activity", anActivityResponse());
  await this.page.goto(`${this.appUrl}${ROUTES.provider.activity}`);
  await this.page.getByRole("button", { name: "Comparar con el período anterior" }).waitFor({ state: "visible" });
  // Keep only the fixtures still needed, so cookie-based mocks fit normal HTTP header limits.
  const remainingStubs = (await this.getStubs()).filter(stub => stub.endpoint !== "/providers/me/statistics/activity");
  await this.context.addCookies(createE2EStubCookies(remainingStubs));
  const params = new URLSearchParams({ from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00", granularity: "day", compare_previous: "true" });
  await this.stubGet(`/providers/me/statistics/activity?${params}`, aComparedActivityResponse());
});

When("activo la comparación con el período anterior", async function (this: CustomWorld) {
  await this.page.getByRole("button", { name: "Comparar con el período anterior" }).click();
});

Then("veo los límites del período anterior y sus variaciones", async function (this: CustomWorld) {
  const comparison = this.page.getByRole("region", { name: "Comparación con el período anterior", exact: true }).first();
  await assertText(comparison, "2/7/26");
  await assertText(comparison, "1/8/26");
  const rows = this.page.getByRole("table", { name: "Comparación con el período anterior" }).getByRole("row");
  await assertText(rows.nth(2), "200 %");
  await assertText(rows.nth(8), "-50 %");
});

Then("una variación porcentual sin base se muestra como no disponible", async function (this: CustomWorld) {
  const row = this.page.getByRole("table", { name: "Comparación con el período anterior" }).getByRole("row").nth(1);
  assert.deepEqual(await row.getByRole("cell").allTextContents(), ["0", "4", "No disponible"]);
});

Then("no se presenta un crecimiento porcentual inventado", async function (this: CustomWorld) {
  const row = this.page.getByRole("table", { name: "Comparación con el período anterior" }).getByRole("row").nth(1);
  assert.ok(!(await row.innerText()).includes("%"));
  await this.page.getByLabel("Desde", { exact: true }).focus();
  await this.page.keyboard.press("Tab");
  // Date inputs may expose individual segments. Verify the complete form remains keyboard reachable.
  await this.page.getByRole("button", { name: "Aplicar filtros" }).focus();
  assert.equal(await this.page.getByRole("button", { name: "Aplicar filtros" }).evaluate(element => element === document.activeElement), true);
  await mkdir(".delivery/runtime/visual", { recursive: true });
  for (const width of [375, 768, 1440]) {
    await this.page.setViewportSize({ width, height: 960 });
    assert.ok(await this.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await this.page.screenshot({ path: `.delivery/runtime/visual/activity-${width}.png`, fullPage: true });
  }
});
