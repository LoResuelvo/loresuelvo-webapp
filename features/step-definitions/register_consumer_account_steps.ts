import {
  Given,
  When,
  Then,
  Before,
  After,
  setDefaultTimeout,
} from "@cucumber/cucumber";
import { Browser, Page, chromium } from "playwright";
import assert from "assert";

setDefaultTimeout(30_000);

const APP_URL = process.env.APP_URL;

let browser: Browser;
let page: Page;

Before(async () => {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
});

After(async () => {
  await browser.close();
});

Given("que estoy en la página de registro de cuenta nueva", async () => {
  await page.goto(`${APP_URL}/registrar`);
});

Then("veo el título {string}", async (titulo: string) => {
  const heading = page.getByRole("heading", { name: titulo, level: 1 });
  await heading.waitFor({ state: "visible" });
  assert.ok(await heading.isVisible(), `No se encontró el título "${titulo}"`);
});

