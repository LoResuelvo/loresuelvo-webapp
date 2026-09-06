import { BeforeAll, AfterAll, Before, After, setDefaultTimeout, ITestCaseHookParameter } from "@cucumber/cucumber";
import { Browser, chromium } from "playwright";
import { CustomWorld } from "./world";

setDefaultTimeout(30_000);

let globalBrowser: Browser;

BeforeAll(async () => {
  globalBrowser = await chromium.launch({ headless: true });
});

AfterAll(async () => {
  await globalBrowser?.close();
});

Before(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  if (!globalBrowser) {
    globalBrowser = await chromium.launch({ headless: true });
  }
  this.browser = globalBrowser;
  this.context = await globalBrowser.newContext();
  this.page = await this.context.newPage();

  const scenarioName = scenario.pickle?.name || "Unknown Scenario";
  const featureUri = scenario.gherkinDocument?.uri || "";
  await this.context.addCookies([
    {
      name: "__e2e_scenario",
      value: encodeURIComponent(`${scenarioName} (${featureUri})`),
      domain: "localhost",
      path: "/",
    },
  ]);

  await this.page.route("**/api/ws-tickets", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ticket: "global-mocked-ws-ticket" }),
    });
  });

  await this.page.route("https://www.mercadopago.com.ar/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body>Mercado Pago Checkout</body></html>",
    });
  });

  await this.addApiStub({
    method: "GET",
    endpoint: "/service-proposals",
    status: 200,
    body: [],
  });
});

After(async function (this: CustomWorld) {
  await this.context?.close();
});
