import { Given, When, Then, Before, After, setDefaultTimeout } from "@cucumber/cucumber";
import { Browser, Page, chromium } from "playwright";
import assert from "assert";

setDefaultTimeout(30_000);

const APP_URL = process.env.APP_URL || "http://localhost:3000";

let browser: Browser;
let page: Page;

Before(async () => {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
});

After(async () => {
  await browser.close();
});

Given('no estoy logueado', async () => {
  await page.context().clearCookies();
});

When('entro a la landing page', async () => {
  await page.goto(APP_URL);
});

Then('veo el título {string}', async (titulo: string) => {
  const heading = page.getByRole("heading", { name: titulo, level: 1 }).first();
  await heading.waitFor({ state: "visible" });
  assert.ok(await heading.isVisible(), `There is no main title "${titulo}"`);
});

Then('veo el botón {string}', async (buttonName: string) => {
  const button = page.getByRole('button', { name: buttonName })
                     .or(page.getByRole('link', { name: buttonName })).first();
  await button.waitFor({ state: "visible" });
  assert.ok(await button.isVisible(), `There is no button or link "${buttonName}"`);
});

Then('veo el footer', async () => {
  const footer = page.locator('footer');
  await footer.waitFor({ state: "visible" });
  assert.ok(await footer.isVisible(), "There is no footer");
});

Then('veo el texto {string}', async (text: string) => {
  const textElement = page.getByText(text, { exact: false });
  await textElement.waitFor({ state: "visible" });
  assert.ok(await textElement.isVisible(), `There is no text: "${text}"`);
});
