import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld, APP_URL } from "../support/world";
import assert from "assert";


Given("no estoy logueado", async function (this: CustomWorld) {
  await this.page.context().clearCookies();
});

When("entro a la landing page", async function (this: CustomWorld) {
  await this.page.goto(APP_URL);
});

Then("veo el título {string}", async function (this: CustomWorld, titulo: string) {
  const heading = this.page.getByRole("heading", { name: titulo, level: 1 }).first();
  await heading.waitFor({ state: "visible" });
  assert.ok(await heading.isVisible(), `There is no main title "${titulo}"`);
});

Then("veo el botón {string}", async function (this: CustomWorld, buttonName: string) {
  const button = this.page
    .getByRole("button", { name: buttonName })
    .or(this.page.getByRole("link", { name: buttonName }))
    .first();
  await button.waitFor({ state: "visible" });
  assert.ok(await button.isVisible(), `There is no button or link "${buttonName}"`);
});

Then("veo el footer", async function (this: CustomWorld) {
  const footer = this.page.locator("footer");
  await footer.waitFor({ state: "visible" });
  assert.ok(await footer.isVisible(), "There is no footer");
});

Then("veo el texto {string}", async function (this: CustomWorld, text: string) {
  const textElement = this.page.getByText(text, { exact: false });
  await textElement.waitFor({ state: "visible" });
  assert.ok(await textElement.isVisible(), `There is no text: "${text}"`);
});
