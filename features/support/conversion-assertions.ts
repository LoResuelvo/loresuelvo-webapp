import type { Locator, Page } from "playwright";
import assert from "node:assert/strict";
import type { ApiProviderConversion } from "../../infrastructure/api/types";
import { t } from "../../infrastructure/i18n/translations";

export async function assertText(locator: Locator, ...texts: string[]) {
  await locator.waitFor({ state: "visible" });
  const content = await locator.innerText();
  for (const text of texts) assert.ok(content.includes(text));
}

export async function assertSituationCounts(page: Page, response: ApiProviderConversion) {
  const { proposals, requests } = response;
  await assertText(page.getByTestId("funnel-stage-issued"), String(proposals.stages.issued));
  await assertText(page.getByTestId("funnel-stage-contracted"), String(proposals.stages.contracted));
  await assertText(page.getByTestId("requests-received"), String(requests.received));
  await assertText(page.getByTestId("requests-accepted"), String(requests.accepted));
}

export async function assertSituationPercentage(page: Page, response: ApiProviderConversion, porcentaje: string) {
  const contracted = page.getByTestId("funnel-stage-contracted");
  const requestsRate = page.getByTestId("requests-acceptance-rate");
  if (porcentaje === "No disponible") {
    await assertText(contracted, t.providerConversion.unavailable);
    await assertText(requestsRate, t.providerConversion.unavailable);
    assert.equal((await page.locator("main").innerText()).includes("0 %"), false);
    return;
  }
  if (response.proposals.rates.contracted.cohort.percentage === 0) {
    await assertText(contracted, "0 %");
    assert.equal((await contracted.innerText()).includes(t.providerConversion.unavailable), false);
  }
  if (response.requests.acceptance_rate.percentage === 0) {
    await assertText(requestsRate, "0 %");
    assert.equal((await requestsRate.innerText()).includes(t.providerConversion.unavailable), false);
  }
}

export async function fillDateRange(page: Page, from: string, through: string) {
  await page.getByLabel("Desde", { exact: true }).fill(from);
  await page.getByLabel("Hasta (incluido)").fill(through);
}

export async function assertNoZeroConversion(page: Page) {
  assert.equal(await page.getByTestId("funnel-stage-issued").count(), 0);
  assert.equal(await page.getByTestId("funnel-stage-contracted").count(), 0);
  assert.equal(await page.getByTestId("uncontracted-proposals").count(), 0);
  assert.equal(await page.getByTestId("conversion-requests-section").count(), 0);
  assert.equal((await page.locator("main").innerText()).includes("0 %"), false);
}

export async function assertNoTemporalEvolution(page: Page) {
  assert.equal(await page.getByLabel("Agrupación").count(), 0);
  assert.equal(await page.getByRole("checkbox", { name: /comparar/i }).count(), 0);
  assert.equal(await page.getByRole("table").count(), 0);
  assert.equal(await page.getByText("Evolución cronológica").count(), 0);
}

export async function assertFailedRangeError(page: Page) {
  const alert = page.locator("main").getByRole("alert");
  await alert.waitFor({ state: "visible" });
  await assertText(alert, t.providerConversion.error);
  const failedRange = page.getByTestId("conversion-failed-range");
  await failedRange.waitFor({ state: "visible" });
  await assertText(failedRange, "1/6/26", "1/7/26");
}

export async function assertErrorNotZeroConversion(page: Page) {
  assert.equal(await page.locator("main").getByRole("alert").count(), 0);
  assert.equal(await page.getByTestId("conversion-failed-range").count(), 0);
  await assertText(page.getByTestId("funnel-stage-issued"), "20");
  assert.notEqual((await page.getByTestId("funnel-stage-issued").innerText()).trim(), "0");
}
