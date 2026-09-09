import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../support/world";
import { anApiError } from "../support/factories";
import type { Page } from "playwright";
import assert from "assert";

interface GooglePlacesFakeOptions {
  suggestionText: string;
  street: string;
  streetNumber: string;
}

async function enableGooglePlacesFake(page: Page, options: GooglePlacesFakeOptions) {
  await page.addInitScript((config: GooglePlacesFakeOptions) => {
    type PlaceChangedListener = () => void;
    type FakeAutocomplete = {
      addListener: (eventName: string, handler: PlaceChangedListener) => { remove: () => void };
      getPlace: () => { address_components: Array<{ long_name: string; types: string[] }> };
    };
    type FakeAutocompleteConstructor = new (
      input: HTMLInputElement,
      options: unknown
    ) => FakeAutocomplete;

    class FakeAutocompleteImplementation implements FakeAutocomplete {
      private place = {
        address_components: [
          { long_name: config.street, types: ["route"] },
          { long_name: config.streetNumber, types: ["street_number"] },
        ],
      };
      private readonly listeners: PlaceChangedListener[] = [];
      private suggestionList: HTMLDivElement | null = null;

      constructor(private readonly input: HTMLInputElement, _options: unknown) {
        input.addEventListener("input", this.showSuggestion);
      }

      addListener(eventName: string, handler: PlaceChangedListener) {
        if (eventName === "place_changed") this.listeners.push(handler);
        return {
          remove: () => {
            const index = this.listeners.indexOf(handler);
            if (index >= 0) this.listeners.splice(index, 1);
          },
        };
      }

      getPlace() {
        return this.place;
      }

      private showSuggestion = () => {
        this.suggestionList?.remove();
        this.suggestionList = null;
        if (!this.input.value.trim()) return;

        const list = document.createElement("div");
        list.setAttribute("role", "listbox");
        list.setAttribute("aria-label", "Sugerencias de direcciones");
        const option = document.createElement("button");
        option.type = "button";
        option.setAttribute("role", "option");
        option.textContent = config.suggestionText;
        option.addEventListener("click", () => {
          this.listeners.forEach((listener) => listener());
          list.remove();
          this.suggestionList = null;
        });
        list.appendChild(option);
        document.body.appendChild(list);
        this.suggestionList = list;
      };
    }

    const fakeWindow = window as unknown as {
      google?: { maps?: { places?: { Autocomplete: FakeAutocompleteConstructor } } };
    };
    fakeWindow.google = {
      maps: { places: { Autocomplete: FakeAutocompleteImplementation } },
    };
  }, options);

  await page.reload();
  const consumerButton = page.getByText("Soy Cliente").first();
  await consumerButton.waitFor({ state: "visible" });
  await consumerButton.click();
  await page.getByText("Continuar").first().click();
  await page.waitForSelector('input[name="firstName"]');
}

When("avanzo al paso de datos de perfil", async function (this: CustomWorld) {
  const continueButton = this.page.getByRole("button", { name: /continuar/i }).first();
  if (await continueButton.isVisible().catch(() => false)) {
    await continueButton.click();
  }
  await this.page.waitForSelector('input[name="firstName"]');
});

Then(
  "veo los campos {string}, {string}, {string} y {string}",
  async function (this: CustomWorld, field1: string, field2: string, field3: string, field4: string) {
    for (const fieldName of [field1, field2, field3, field4]) {
      const input = this.page.getByLabel(fieldName).first();
      await input.waitFor({ state: "visible", timeout: 5000 });
      assert.ok(await input.isVisible(), `No se encontró el campo visible "${fieldName}"`);
    }
  }
);

Then(
  "{string} y {string} son obligatorios",
  async function (this: CustomWorld, field1: string, field2: string) {
    for (const fieldName of [field1, field2]) {
      const input = this.page.getByLabel(fieldName).first();
      await input.waitFor({ state: "attached", timeout: 5000 });
      const isRequired = await input.evaluate((el: HTMLInputElement) => el.required || el.getAttribute("aria-required") === "true");
      assert.ok(isRequired, `El campo "${fieldName}" debería ser obligatorio`);
    }
  }
);

Then(
  "{string} y {string} son opcionales",
  async function (this: CustomWorld, field1: string, field2: string) {
    for (const fieldName of [field1, field2]) {
      const input = this.page.getByLabel(fieldName).first();
      await input.waitFor({ state: "attached", timeout: 5000 });
      const isRequired = await input.evaluate((el: HTMLInputElement) => el.required || el.getAttribute("aria-required") === "true");
      assert.ok(!isRequired, `El campo "${fieldName}" debería ser opcional`);
    }
  }
);

Given(
  "ingreso la calle {string} y el número {string}",
  async function (this: CustomWorld, street: string, streetNumber: string) {
    (this as any).explicitAddressSet = true;
    await this.page.getByLabel("Calle").fill(street);
    await this.page.getByLabel("Número").fill(streetNumber);
  }
);

Given(
  "ingreso la calle {string}, número {string}, piso {string} y departamento {string}",
  async function (this: CustomWorld, street: string, streetNumber: string, floor: string, unit: string) {
    (this as any).explicitAddressSet = true;
    await this.page.getByLabel("Calle").fill(street);
    await this.page.getByLabel("Número").fill(streetNumber);
    await this.page.getByLabel("Piso").fill(floor);
    await this.page.getByLabel("Departamento").fill(unit);
  }
);

Given(
  "ingreso el número {string} pero dejo la calle vacía",
  async function (this: CustomWorld, streetNumber: string) {
    (this as any).explicitAddressSet = true;
    const streetInput = this.page.getByLabel("Calle").first();
    await streetInput.waitFor({ state: "visible" });
    await streetInput.fill("");
    const numberInput = this.page.getByLabel("Número").first();
    await numberInput.waitFor({ state: "visible" });
    await numberInput.fill(streetNumber);
  }
);

Given(
  "ingreso la calle {string} pero dejo el número vacío",
  async function (this: CustomWorld, street: string) {
    (this as any).explicitAddressSet = true;
    const streetInput = this.page.getByLabel("Calle").first();
    await streetInput.waitFor({ state: "visible" });
    await streetInput.fill(street);
    const numberInput = this.page.getByLabel("Número").first();
    await numberInput.waitFor({ state: "visible" });
    await numberInput.fill("");
  }
);

Given("la API responde que la dirección no pudo geolocalizarse", async function (this: CustomWorld) {
  await this.stubPost("/consumers", 400, anApiError("Address could not be validated"));
});

Given("la API responde que la dirección está fuera del área de servicio", async function (this: CustomWorld) {
  await this.stubPost("/consumers", 400, anApiError("Services are not available in this location"));
});

Given("la API de ubicación no está disponible temporalmente", async function (this: CustomWorld) {
  await this.stubPost("/consumers", 503, anApiError("Address validation is temporarily unavailable"));
});

Given(
  "Google Places Autocomplete está disponible con sugerencias para {string}",
  async function (this: CustomWorld, query: string) {
    await enableGooglePlacesFake(this.page, {
      suggestionText: `Av. ${query} 5100, Buenos Aires`,
      street: `Av. ${query}`,
      streetNumber: "5100",
    });
  }
);

Given("Google Places Autocomplete está disponible", async function (this: CustomWorld) {
  await enableGooglePlacesFake(this.page, {
    suggestionText: "Av. Rivadavia 5100, Buenos Aires",
    street: "Av. Rivadavia",
    streetNumber: "5100",
  });
});

When("escribo {string} en el campo {string}", async function (this: CustomWorld, value: string, fieldName: string) {
  await this.page.getByLabel(fieldName).fill(value);
});

Then(
  "veo sugerencias de direcciones que incluyen {string}",
  async function (this: CustomWorld, expectedText: string) {
    const options = this.page.getByRole("option");
    await options.first().waitFor({ state: "visible" });
    const optionTexts = await options.allTextContents();
    assert.ok(
      optionTexts.some((text) => text.includes(expectedText)),
      `No se encontró una sugerencia que incluya "${expectedText}"`
    );
  }
);

When("selecciono la sugerencia {string}", async function (this: CustomWorld, suggestion: string) {
  await this.page.getByRole("option", { name: suggestion }).click();
});

Then(
  "el campo {string} contiene {string}",
  async function (this: CustomWorld, fieldName: string, expectedValue: string) {
    const input = this.page.getByLabel(fieldName);
    await input.waitFor({ state: "visible" });
    assert.equal(await input.inputValue(), expectedValue);
  }
);

Then(
  "veo el mensaje de error {string} debajo del campo {string}",
  async function (this: CustomWorld, errorMessage: string, fieldName: string) {
    const input = this.page.getByLabel(fieldName).first();
    await input.waitFor({ state: "visible" });
    const container = input.locator("xpath=..");
    const error = container.getByRole("alert");
    await error.waitFor({ state: "visible" });
    const text = await error.textContent();
    assert.ok(
      text?.includes(errorMessage),
      `Se esperaba el mensaje "${errorMessage}" debajo de "${fieldName}" pero se encontró "${text}"`
    );
  }
);
