import { Given, When, Then } from "@cucumber/cucumber";
import { page } from "./landing_page_visualization_steps";
import assert from "assert";
import { ROUTES } from "../../lib/routes";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const PROVIDER_URL = APP_URL + ROUTES.provider.home;

When('entro al home de prestadores', async () => {
  await page.goto(PROVIDER_URL);
});

Given('elegí la opción de prestador en la pagina de registro', async () => {
  // To be implemented
});