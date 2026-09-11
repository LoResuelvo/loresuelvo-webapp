import { BeforeAll, AfterAll, Before, After, setDefaultTimeout, ITestCaseHookParameter } from "@cucumber/cucumber";
import { Browser, chromium } from "playwright";
import { CustomWorld } from "./world";

setDefaultTimeout(30_000);

let globalBrowser: Browser;

const CHROMIUM_LAUNCH_OPTIONS = {
  headless: true,
};

BeforeAll(async () => {
  globalBrowser = await chromium.launch(CHROMIUM_LAUNCH_OPTIONS);
});

AfterAll(async () => {
  if (globalBrowser?.isConnected()) {
    await globalBrowser.close().catch(() => {});
  }
});

Before(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  if (!globalBrowser || !globalBrowser.isConnected()) {
    globalBrowser = await chromium.launch(CHROMIUM_LAUNCH_OPTIONS);
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
  try {
    if (this.page && !this.page.isClosed()) {
      await this.page.close({ runBeforeUnload: false });
    }
  } catch {
    // ignore
  }

  try {
    if (this.context) {
      await this.context.close();
    }
  } catch {
    try {
      if (globalBrowser?.isConnected()) {
        await globalBrowser.close().catch(() => {});
      }
    } catch {
      // ignore
    }
    globalBrowser = await chromium.launch(CHROMIUM_LAUNCH_OPTIONS);
  }
});
