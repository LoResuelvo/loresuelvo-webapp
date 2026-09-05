import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld, APP_URL } from "../support/world";
import { setSelectedRole } from "./register_consumer_account_steps";
import { aCoverageZone, aCategory, anApiError } from "../support/factories";
import assert from "assert";
import { ROUTES } from "../../lib/routes";

Given(
  "la API dispone de las comunas habilitadas {string} y {string}",
  async function (this: CustomWorld, zone1: string, zone2: string) {
    const parseId = (name: string, fallback: number) => {
      const match = name.match(/\d+/);
      return match ? parseInt(match[0], 10) : fallback;
    };
    const zones = [
      aCoverageZone({ id: parseId(zone1, 6), name: zone1 }),
      aCoverageZone({ id: parseId(zone2, 14), name: zone2 }),
    ];
    await this.stubGet("/coverage-zones", zones);
  }
);

Given("Google Maps está disponible con límites para esas comunas", async function (this: CustomWorld) {
  // Presentational stub/container for Google Maps in Batch 1
});

When("elijo la opción de prestador y avanzo al paso de datos de perfil", async function (this: CustomWorld) {
  setSelectedRole("provider");

  if (!(await this.hasApiStub("GET", "/categories"))) {
    await this.stubGet("/categories", [aCategory({ id: 1, name: "Plomería" })]);
  }

  await this.page.goto(APP_URL + ROUTES.onboarding);
  const providerButton = this.page
    .locator("#role-provider-btn")
    .or(this.page.getByText("Soy Prestador"))
    .first();
  await providerButton.click();
  const continueButton = this.page.getByRole("button", { name: /continuar/i }).first();
  await continueButton.click();
  await this.page.waitForSelector('input[name="firstName"]');
});

Then("veo el estado de carga de las zonas de cobertura", async function (this: CustomWorld) {
  const loading = this.page.locator('[data-testid="coverage-zones-loading"]').first();
  const list = this.page.locator('[data-testid="coverage-zones-list"]').first();

  const isVisible =
    (await loading.isVisible().catch(() => false)) ||
    (await list.isVisible().catch(() => false)) ||
    (await list.waitFor({ state: "visible", timeout: 10000 }).then(() => true).catch(() => false));

  assert.ok(isVisible, "No se encontró el estado de carga ni la lista cargada de zonas de cobertura.");
});

Then("veo los nombres de las comunas disponibles en la lista accesible", async function (this: CustomWorld) {
  const comuna6 = this.page.getByText("Comuna 6").first();
  const comuna14 = this.page.getByText("Comuna 14").first();
  await comuna6.waitFor({ state: "visible", timeout: 10000 });
  await comuna14.waitFor({ state: "visible", timeout: 10000 });
  assert.ok(await comuna6.isVisible(), "No se encontró Comuna 6 en la lista");
  assert.ok(await comuna14.isVisible(), "No se encontró Comuna 14 en la lista");
});

Then("veo sus límites identificados en el mapa de CABA", async function (this: CustomWorld) {
  const map = this.page.locator('[data-testid="coverage-map"]').first();
  await map.waitFor({ state: "visible", timeout: 10000 });
  assert.ok(await map.isVisible(), "No se visualiza el mapa de zonas de cobertura");
});

Given("la API responde que no hay comunas habilitadas", async function (this: CustomWorld) {
  await this.stubGet("/coverage-zones", []);
});

Then(
  "veo un mensaje que informa que no hay zonas de cobertura disponibles",
  async function (this: CustomWorld) {
    const emptyMessage = this.page
      .locator('[data-testid="coverage-zones-empty"]')
      .or(this.page.getByText("No hay zonas de cobertura disponibles en este momento."))
      .first();
    await emptyMessage.waitFor({ state: "visible", timeout: 10000 });
    assert.ok(
      await emptyMessage.isVisible(),
      "No se encontró el mensaje que informa que no hay zonas disponibles"
    );
  }
);

Then("no puedo finalizar el registro como prestador", async function (this: CustomWorld) {
  const submitButton = this.page.getByRole("button", { name: /finalizar registro/i });
  await submitButton.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(
    await submitButton.isDisabled(),
    "El botón de finalizar registro debería estar deshabilitado cuando no hay zonas de cobertura"
  );
});

Given("la consulta de zonas falló y veo su estado de error", async function (this: CustomWorld) {
  setSelectedRole("provider");
  await this.stubGet("/coverage-zones", anApiError("Internal Server Error"), 500);

  if (!(await this.hasApiStub("GET", "/categories"))) {
    await this.stubGet("/categories", [aCategory({ id: 1, name: "Plomería" })]);
  }

  await this.page.goto(APP_URL + ROUTES.onboarding);
  const providerButton = this.page
    .locator("#role-provider-btn")
    .or(this.page.getByText("Soy Prestador"))
    .first();
  await providerButton.click();
  const continueButton = this.page.getByRole("button", { name: /continuar/i }).first();
  await continueButton.click();
  await this.page.waitForSelector('input[name="firstName"]');

  const errorBox = this.page
    .locator('[data-testid="coverage-zones-error"]')
    .or(this.page.getByText("No pudimos cargar las zonas de cobertura. Intentá nuevamente."))
    .first();
  await errorBox.waitFor({ state: "visible", timeout: 10000 });
  assert.ok(await errorBox.isVisible(), "No se visualizó el estado de error de zonas de cobertura");
});

Given("la API vuelve a estar disponible", async function (this: CustomWorld) {
  const zones = [
    aCoverageZone({ id: 6, name: "Comuna 6" }),
    aCoverageZone({ id: 14, name: "Comuna 14" }),
  ];
  await this.stubGet("/coverage-zones", zones);
});

When("reintento cargar las zonas de cobertura", async function (this: CustomWorld) {
  const retryButton = this.page
    .getByRole("button", { name: /reintentar/i })
    .or(this.page.getByText("Reintentar"))
    .first();
  await retryButton.waitFor({ state: "visible", timeout: 5000 });
  await retryButton.click();
});

Then("veo la lista de comunas habilitadas", async function (this: CustomWorld) {
  const list = this.page.locator('[data-testid="coverage-zones-list"]').first();
  await list.waitFor({ state: "visible", timeout: 10000 });
  assert.ok(await list.isVisible(), "No se mostró la lista de comunas tras el reintento");
});

Then("puedo seleccionar una zona para continuar", async function (this: CustomWorld) {
  const checkbox = this.page.locator('input[name="coverageZones"][value="6"]').first();
  await checkbox.waitFor({ state: "attached", timeout: 5000 });
  await checkbox.check();
  assert.ok(await checkbox.isChecked(), "La comuna seleccionada debería figurar marcada");
});

Given(
  "estoy en los datos de perfil con {string} y {string} disponibles",
  async function (this: CustomWorld, zone1: string, zone2: string) {
    const parseId = (name: string, fallback: number) => {
      const match = name.match(/\d+/);
      return match ? parseInt(match[0], 10) : fallback;
    };
    const zones = [
      aCoverageZone({ id: parseId(zone1, 6), name: zone1 }),
      aCoverageZone({ id: parseId(zone2, 14), name: zone2 }),
    ];
    await this.stubGet("/coverage-zones", zones);

    if (!(await this.hasApiStub("GET", "/categories"))) {
      await this.stubGet("/categories", [aCategory({ id: 1, name: "Plomería" })]);
    }

    setSelectedRole("provider");
    await this.page.goto(APP_URL + ROUTES.onboarding);
    const providerButton = this.page
      .locator("#role-provider-btn")
      .or(this.page.getByText("Soy Prestador"))
      .first();
    await providerButton.click();
    const continueButton = this.page.getByRole("button", { name: /continuar/i }).first();
    await continueButton.click();
    await this.page.waitForSelector('input[name="firstName"]');
  }
);

When(
  "selecciono {string} y {string} desde la lista de zonas",
  async function (this: CustomWorld, zone1: string, zone2: string) {
    const item1 = this.page.getByTestId("coverage-zones-list").getByText(zone1).first();
    await item1.waitFor({ state: "visible", timeout: 10000 });
    await item1.click();

    const item2 = this.page.getByTestId("coverage-zones-list").getByText(zone2).first();
    await item2.waitFor({ state: "visible", timeout: 10000 });
    await item2.click();
  }
);

Then("ambas comunas figuran seleccionadas en la lista", async function (this: CustomWorld) {
  const check1 = this.page.locator('input[name="coverageZones"][value="6"]').first();
  const check2 = this.page.locator('input[name="coverageZones"][value="14"]').first();
  await check1.waitFor({ state: "attached", timeout: 5000 });
  await check2.waitFor({ state: "attached", timeout: 5000 });
  assert.ok(await check1.isChecked(), "Comuna 6 no está seleccionada en la lista");
  assert.ok(await check2.isChecked(), "Comuna 14 no está seleccionada en la lista");
});

Then("ambos polígonos figuran seleccionados en el mapa", async function (this: CustomWorld) {
  const mapZone6 = this.page.locator('[data-testid="map-zone-6"]').first();
  const mapZone14 = this.page.locator('[data-testid="map-zone-14"]').first();
  await mapZone6.waitFor({ state: "visible", timeout: 5000 });
  await mapZone14.waitFor({ state: "visible", timeout: 5000 });
  const class6 = (await mapZone6.getAttribute("class")) || "";
  const class14 = (await mapZone14.getAttribute("class")) || "";
  assert.ok(class6.includes("bg-brand-primary"), "Comuna 6 no figura seleccionada en el mapa");
  assert.ok(class14.includes("bg-brand-primary"), "Comuna 14 no figura seleccionada en el mapa");
});

Given(
  "seleccioné {string} en la lista y en el mapa",
  async function (this: CustomWorld, zoneName: string) {
    const parseId = (name: string, fallback: number) => {
      const match = name.match(/\d+/);
      return match ? parseInt(match[0], 10) : fallback;
    };
    const zoneId = parseId(zoneName, 6);
    const zones = [
      aCoverageZone({ id: 6, name: "Comuna 6" }),
      aCoverageZone({ id: 14, name: "Comuna 14" }),
    ];
    await this.stubGet("/coverage-zones", zones);

    if (!(await this.hasApiStub("GET", "/categories"))) {
      await this.stubGet("/categories", [aCategory({ id: 1, name: "Plomería" })]);
    }

    setSelectedRole("provider");
    await this.page.goto(APP_URL + ROUTES.onboarding);
    const providerButton = this.page
      .locator("#role-provider-btn")
      .or(this.page.getByText("Soy Prestador"))
      .first();
    await providerButton.click();
    const continueButton = this.page.getByRole("button", { name: /continuar/i }).first();
    await continueButton.click();
    await this.page.waitForSelector('input[name="firstName"]');

    const item = this.page.getByTestId("coverage-zones-list").getByText(zoneName).first();
    await item.waitFor({ state: "visible", timeout: 10000 });
    await item.click();

    const check = this.page.locator(`input[name="coverageZones"][value="${zoneId}"]`).first();
    await check.waitFor({ state: "attached", timeout: 5000 });
    assert.ok(await check.isChecked(), `${zoneName} debería estar seleccionada inicialmente`);
  }
);

When(
  "vuelvo a seleccionar {string} desde la lista de zonas",
  async function (this: CustomWorld, zoneName: string) {
    const item = this.page.getByTestId("coverage-zones-list").getByText(zoneName).first();
    await item.waitFor({ state: "visible", timeout: 10000 });
    await item.click();
  }
);

Then(
  "{string} deja de figurar seleccionada en la lista",
  async function (this: CustomWorld, zoneName: string) {
    const parseId = (name: string, fallback: number) => {
      const match = name.match(/\d+/);
      return match ? parseInt(match[0], 10) : fallback;
    };
    const zoneId = parseId(zoneName, 6);
    const check = this.page.locator(`input[name="coverageZones"][value="${zoneId}"]`).first();
    await check.waitFor({ state: "attached", timeout: 5000 });
    assert.ok(!(await check.isChecked()), `${zoneName} no debería figurar seleccionada en la lista`);
  }
);

Then("su polígono deja de figurar seleccionado en el mapa", async function (this: CustomWorld) {
  const mapZone6 = this.page.locator('[data-testid="map-zone-6"]').first();
  await mapZone6.waitFor({ state: "visible", timeout: 5000 });
  const class6 = (await mapZone6.getAttribute("class")) || "";
  assert.ok(!class6.includes("bg-brand-primary"), "El polígono no debería figurar seleccionado en el mapa");
});

Given(
  "completé los datos, el rubro y la foto obligatorios del prestador",
  async function (this: CustomWorld) {
    (this as any).providerRegistrationSent = false;
    this.page.on("request", (req) => {
      if (req.method() === "POST" && req.url().includes("/providers")) {
        (this as any).providerRegistrationSent = true;
      }
    });

    const zones = [
      aCoverageZone({ id: 6, name: "Comuna 6" }),
      aCoverageZone({ id: 14, name: "Comuna 14" }),
    ];
    await this.stubGet("/coverage-zones", zones);

    if (!(await this.hasApiStub("GET", "/categories"))) {
      await this.stubGet("/categories", [aCategory({ id: 1, name: "Plomería" })]);
    }

    setSelectedRole("provider");
    await this.page.goto(APP_URL + ROUTES.onboarding);
    const providerButton = this.page
      .locator("#role-provider-btn")
      .or(this.page.getByText("Soy Prestador"))
      .first();
    await providerButton.click();
    const continueButton = this.page.getByRole("button", { name: /continuar/i }).first();
    await continueButton.click();
    await this.page.waitForSelector('input[name="firstName"]');

    await this.page.getByLabel("Nombre").fill("Carlos");
    await this.page.getByLabel("Apellido").fill("López");

    const select = this.page.getByLabel("Rubro").or(this.page.locator("select")).first();
    await select.waitFor();
    await select.selectOption("Plomería");

    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.waitFor({ state: "attached" });
    await fileInput.setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(1024 * 1024, "a"),
    });
  }
);

Given("no seleccioné ninguna zona de cobertura", async function (this: CustomWorld) {
  const checked = await this.page.locator('input[name="coverageZones"]:checked').count();
  assert.equal(checked, 0, "No debería haber ninguna zona seleccionada");
});

Then("veo el mensaje de error {string}", async function (this: CustomWorld, errorMessage: string) {
  const errorElement = this.page
    .locator('[role="alert"]')
    .or(this.page.getByText(errorMessage))
    .first();
  await errorElement.waitFor({ state: "visible", timeout: 5000 });
  const text = await errorElement.innerText();
  assert.ok(
    text.includes(errorMessage) || (await this.page.getByText(errorMessage).first().isVisible()),
    `No se encontró el mensaje de error "${errorMessage}"`
  );
});

Then("no se envía el registro del prestador", async function (this: CustomWorld) {
  assert.ok(
    !(this as any).providerRegistrationSent,
    "El registro del prestador no debería haberse enviado"
  );
});

Given(
  "estoy en los datos de perfil con el mapa de comunas disponible",
  async function (this: CustomWorld) {
    const zones = [
      aCoverageZone({ id: 6, name: "Comuna 6" }),
      aCoverageZone({ id: 14, name: "Comuna 14" }),
    ];
    await this.stubGet("/coverage-zones", zones);

    if (!(await this.hasApiStub("GET", "/categories"))) {
      await this.stubGet("/categories", [aCategory({ id: 1, name: "Plomería" })]);
    }

    setSelectedRole("provider");
    await this.page.goto(APP_URL + ROUTES.onboarding);
    const providerButton = this.page
      .locator("#role-provider-btn")
      .or(this.page.getByText("Soy Prestador"))
      .first();
    await providerButton.click();
    const continueButton = this.page.getByRole("button", { name: /continuar/i }).first();
    await continueButton.click();
    await this.page.waitForSelector('input[name="firstName"]');

    const map = this.page.locator('[data-testid="coverage-map"]').first();
    await map.waitFor({ state: "visible", timeout: 10000 });
  }
);

When(
  "selecciono el polígono de {string} en el mapa",
  async function (this: CustomWorld, zoneName: string) {
    const parseId = (name: string, fallback: number) => {
      const match = name.match(/\d+/);
      return match ? parseInt(match[0], 10) : fallback;
    };
    const zoneId = parseId(zoneName, 14);
    const polygon = this.page.locator(`[data-testid="map-zone-${zoneId}"]`).first();
    await polygon.waitFor({ state: "visible", timeout: 5000 });
    await polygon.click();
  }
);

Then(
  "el polígono de {string} figura seleccionado",
  async function (this: CustomWorld, zoneName: string) {
    const parseId = (name: string, fallback: number) => {
      const match = name.match(/\d+/);
      return match ? parseInt(match[0], 10) : fallback;
    };
    const zoneId = parseId(zoneName, 14);
    const polygon = this.page.locator(`[data-testid="map-zone-${zoneId}"]`).first();
    await polygon.waitFor({ state: "visible", timeout: 5000 });
    const classAttr = (await polygon.getAttribute("class")) || "";
    const isSelected =
      classAttr.includes("bg-brand-primary") ||
      (await polygon.getAttribute("data-selected")) === "true";
    assert.ok(isSelected, `El polígono de ${zoneName} debería figurar seleccionado en el mapa`);
  }
);

Then(
  "{string} figura seleccionada en la lista accesible",
  async function (this: CustomWorld, zoneName: string) {
    const parseId = (name: string, fallback: number) => {
      const match = name.match(/\d+/);
      return match ? parseInt(match[0], 10) : fallback;
    };
    const zoneId = parseId(zoneName, 14);
    const checkbox = this.page.locator(`input[name="coverageZones"][value="${zoneId}"]`).first();
    await checkbox.waitFor({ state: "attached", timeout: 5000 });
    assert.ok(await checkbox.isChecked(), `${zoneName} debería figurar seleccionada en la lista`);
  }
);

Given(
  "estoy en los datos de perfil sin API key o Map ID de Google Maps",
  async function (this: CustomWorld) {
    const zones = [
      aCoverageZone({ id: 6, name: "Comuna 6" }),
      aCoverageZone({ id: 14, name: "Comuna 14" }),
    ];
    await this.stubGet("/coverage-zones", zones);

    if (!(await this.hasApiStub("GET", "/categories"))) {
      await this.stubGet("/categories", [aCategory({ id: 1, name: "Plomería" })]);
    }

    await this.page.addInitScript(() => {
      (window as any).__MOCK_MAPS_CONFIG__ = "missing";
    });

    setSelectedRole("provider");
    await this.page.goto(APP_URL + ROUTES.onboarding);
    const providerButton = this.page
      .locator("#role-provider-btn")
      .or(this.page.getByText("Soy Prestador"))
      .first();
    await providerButton.click();
    const continueButton = this.page.getByRole("button", { name: /continuar/i }).first();
    await continueButton.click();
    await this.page.waitForSelector('input[name="firstName"]');
  }
);

When(
  "selecciono {string} desde la lista de zonas",
  async function (this: CustomWorld, zoneName: string) {
    const item = this.page.getByTestId("coverage-zones-list").getByText(zoneName).first();
    await item.waitFor({ state: "visible", timeout: 10000 });
    await item.click();
  }
);

Then(
  "{string} figura seleccionada",
  async function (this: CustomWorld, zoneName: string) {
    const parseId = (name: string, fallback: number) => {
      const match = name.match(/\d+/);
      return match ? parseInt(match[0], 10) : fallback;
    };
    const zoneId = parseId(zoneName, 6);
    const checkbox = this.page.locator(`input[name="coverageZones"][value="${zoneId}"]`).first();
    await checkbox.waitFor({ state: "attached", timeout: 5000 });
    assert.ok(await checkbox.isChecked(), `${zoneName} debería figurar seleccionada`);
  }
);

Then(
  "el formulario informa que el mapa no está disponible",
  async function (this: CustomWorld) {
    const notice = this.page
      .locator('[data-testid="coverage-map-unavailable"]')
      .or(this.page.getByText(/el mapa no está disponible/i))
      .first();
    await notice.waitFor({ state: "visible", timeout: 5000 });
    assert.ok(await notice.isVisible(), "No se muestra el aviso de que el mapa no está disponible");
  }
);

Then(
  "puedo continuar el registro mediante la lista",
  async function (this: CustomWorld) {
    const submitButton = this.page.getByRole("button", { name: /finalizar registro/i }).first();
    await submitButton.waitFor({ state: "visible", timeout: 5000 });
    assert.ok(await submitButton.isEnabled(), "El botón de continuar/finalizar debería estar habilitado");
  }
);
