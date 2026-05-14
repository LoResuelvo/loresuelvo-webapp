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

function registerForm() {
  return page.getByRole("form", { name: "Create account" });
}

Given("que estoy en la página de registro de cuenta nueva", async () => {
  await page.goto(`${APP_URL}/registro`);
});

Then("veo el título {string}", async (titulo: string) => {
  const heading = page.getByRole("heading", { name: titulo, level: 1 });
  await heading.waitFor({ state: "visible" });
  assert.ok(await heading.isVisible(), `No se encontró el título "${titulo}"`);
});

Then("veo el formulario de registro de cuenta nueva", async () => {
  const form = registerForm();
  await form.waitFor({ state: "visible" });
  assert.ok(
    await form.isVisible(),
    "No se encontró el formulario de registro de cuenta nueva",
  );
});

Then("veo el subtítulo {string}", async (subtitle: string) => {
  const text = page.getByText(subtitle, { exact: true });
  await text.waitFor({ state: "visible" });
  assert.ok(
    await text.isVisible(),
    `No se encontró el subtítulo "${subtitle}"`,
  );
});

Then("veo el campo {string}", async (label: string) => {
  const field = registerForm().getByLabel(label, { exact: true });
  await field.waitFor({ state: "visible" });
  assert.ok(await field.isVisible(), `No se encontró el campo "${label}"`);
});

Then("veo el botón {string}", async (buttonName: string) => {
  const button = registerForm().getByRole("button", { name: buttonName });
  await button.waitFor({ state: "visible" });
  assert.ok(await button.isVisible(), `No se encontró el botón "${buttonName}"`);
});

When("envío el formulario de registro de cuenta nueva", async () => {
  const form = registerForm();
  await form.getByRole("button", { name: "Crear cuenta" }).click();
});

Then("veo un mensaje de error en el campo {string}", async (label: string) => {
  const field = registerForm().getByLabel(label, { exact: true });
  await field.waitFor({ state: "visible" });
  assert.ok(await field.isVisible(), `No se encontró el campo "${label}"`);
});

Then("veo el mensaje de éxito {string}", async (successMessage: string) => {
  const successMessageElement = page.getByText(successMessage, { exact: true });
  await successMessageElement.waitFor({ state: "visible" });
  assert.ok(await successMessageElement.isVisible(), `No se encontró el mensaje de éxito "${successMessage}"`);
});

Given("completo los campos obligatorios del formulario de registro de cuenta nueva", async () => {
  await page.fill("input[name='firstName']", "John");
  await page.fill("input[name='lastName']", "Doe");
  await page.fill("input[name='email']", "john.doe@example.com");
  await page.fill("input[name='password']", "password123");
});