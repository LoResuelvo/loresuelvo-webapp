import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, APP_URL } from "../support/world";
import { ROUTES } from "../../lib/routes";
import { aCategory, aConversation } from "../support/factories";
import { setConsumerSession } from "./initiate_chat_with_provider_steps";

Given("existe el rubro Plomería", async function (this: CustomWorld) {
  await this.stubGet("/categories", [aCategory({ id: 1, name: "Plomería" })]);
});

Given("estoy en el listado de técnicos del rubro {string}", async function (this: CustomWorld, categoryName: string) {
  await this.page.goto(APP_URL + ROUTES.consumer.buscar + "?category_id=1");
  await this.page.waitForLoadState("networkidle");
});

When(
  "hago clic en el botón {string} del prestador {string}",
  async function (this: CustomWorld, buttonText: string, providerName: string) {
    const card = this.page.locator("div.bg-white").filter({ hasText: providerName }).first();
    await card.waitFor({ state: "visible" });
    const button = card.getByRole("button", { name: buttonText }).or(card.getByRole("link", { name: buttonText }));
    await button.waitFor({ state: "visible" });
    await button.click();
  }
);

Then("se abre el modal {string}", async function (this: CustomWorld, modalTitle: string) {
  const modalHeader = this.page.getByRole("heading", { name: modalTitle }).first();
  await modalHeader.waitFor({ state: "visible" });
  assert.ok(await modalHeader.isVisible(), `No se abrió el modal "${modalTitle}"`);
});

Then("veo el nombre del prestador {string}", async function (this: CustomWorld, providerName: string) {
  const providerInModal = this.page.locator("form").getByText(providerName).first();
  await providerInModal.waitFor({ state: "visible" });
  assert.ok(await providerInModal.isVisible(), `No se ve el nombre del prestador "${providerName}" en el modal`);
});

Then("veo los campos obligatorios {string} y {string}", async function (this: CustomWorld, field1: string, field2: string) {
  const label1 = this.page.locator("form").getByText(field1, { exact: false }).first();
  const label2 = this.page.locator("form").getByText(field2, { exact: false }).first();
  await label1.waitFor({ state: "visible" });
  await label2.waitFor({ state: "visible" });
  assert.ok(await label1.isVisible(), `No se ve el campo ${field1}`);
  assert.ok(await label2.isVisible(), `No se ve el campo ${field2}`);
});

Given(
  "que tengo abierta la ventana modal {string} para {string}",
  async function (this: CustomWorld, modalTitle: string, providerName: string) {
    await setConsumerSession(this);

    await this.stubGet("/categories", [aCategory({ id: 1, name: "Plomería" })]);
    await this.stubGet("/conversations", []);

    await this.stubPost("/job-requests", 201, {
      id: 1,
      conversation_id: 1,
      title: "Pérdida de agua en termotanque",
      description: "El termotanque pierde agua por la base. El agua se acumula y el piloto se apaga.",
    });

    await this.stubGet("/conversations/1", {
      id: 1,
      status: "pending",
      counterpart: {
        id: 1,
        role: "provider",
        name: "Juan",
        surname: "Pérez",
        category_name: "Plomería",
      },
      messages: [
        {
          id: 100,
          sender_role: "consumer",
          content: "Título: Pérdida de agua en termotanque\n\nDescripción: El termotanque pierde agua por la base. El agua se acumula y el piloto se apaga.",
          created_on: new Date().toISOString(),
        },
      ],
      updated_on: new Date().toISOString(),
    });

    await this.page.goto(APP_URL + ROUTES.consumer.buscar + "?category_id=1");
    await this.page.waitForLoadState("networkidle");

    const card = this.page.locator("div.bg-white").filter({ hasText: providerName }).first();
    await card.waitFor({ state: "visible" });
    const button = card.getByRole("button", { name: "Contactar" });
    await button.waitFor({ state: "visible" });
    await button.click();

    const modalHeader = this.page.getByRole("heading", { name: modalTitle }).first();
    await modalHeader.waitFor({ state: "visible" });
  }
);

When("ingreso un titulo, una descripcion y toco el boton {string}", async function (this: CustomWorld, btnText: string) {
  const titleInput = this.page.getByPlaceholder(/Pérdida de agua/i).first();
  await titleInput.waitFor({ state: "visible" });
  await titleInput.fill("Pérdida de agua en termotanque");

  const descInput = this.page.getByPlaceholder(/El termotanque pierde agua/i).first();
  await descInput.waitFor({ state: "visible" });
  await descInput.fill("El termotanque pierde agua por la base. El agua se acumula y el piloto se apaga.");

  const button = this.page.getByRole("button", { name: btnText }).first();
  await button.waitFor({ state: "visible" });
  await button.click();
});

Then("soy redirigido a la pantalla de mensajes con {string}", async function (this: CustomWorld, providerName: string) {
  await this.page.waitForURL(`**${ROUTES.consumer.messages}**`);
  assert.ok(this.page.url().includes(ROUTES.consumer.messages), `Expected URL to contain ${ROUTES.consumer.messages}`);
});

Given("que ya envié la solicitud de trabajo a {string}", async function (this: CustomWorld, providerName: string) {
  await setConsumerSession(this);

  await this.stubGet("/conversations", [
    aConversation({
      id: 1,
      status: "pending",
      counterpart: {
        id: 1,
        role: "provider",
        name: "Juan",
        surname: "Pérez",
        category_name: "Plomería",
      },
      last_message: {
        id: 100,
        sender_role: "consumer",
        content: "Título: Pérdida de agua en termotanque\n\nDescripción: El termotanque pierde agua por la base.",
        created_on: new Date().toISOString(),
      },
      updated_on: new Date().toISOString(),
    }),
  ]);

  await this.stubGet("/conversations/1", {
    id: 1,
    status: "pending",
    counterpart: {
      id: 1,
      role: "provider",
      name: "Juan",
      surname: "Pérez",
      category_name: "Plomería",
    },
    messages: [
      {
        id: 100,
        sender_role: "consumer",
        content: "Título: Pérdida de agua en termotanque\n\nDescripción: El termotanque pierde agua por la base.",
        created_on: new Date().toISOString(),
      },
    ],
    updated_on: new Date().toISOString(),
  });
});

Then("visualizo al prestador {string} como contacto en mi lista", async function (this: CustomWorld, providerName: string) {
  const contact = this.page.getByText(providerName).first();
  await contact.waitFor({ state: "visible" });
  assert.ok(await contact.isVisible(), `El prestador ${providerName} no aparece como contacto`);
});

Given("que inicié la conversación con {string}", async function (this: CustomWorld, providerName: string) {
  await setConsumerSession(this);

  await this.stubGet("/conversations", [
    aConversation({
      id: 1,
      status: "pending",
      counterpart: {
        id: 1,
        role: "provider",
        name: "Juan",
        surname: "Pérez",
        category_name: "Plomería",
      },
      last_message: {
        id: 100,
        sender_role: "consumer",
        content: "Hola Juan",
        created_on: new Date().toISOString(),
      },
      updated_on: new Date().toISOString(),
    }),
  ]);

  await this.stubGet("/conversations/1", {
    id: 1,
    status: "pending",
    counterpart: {
      id: 1,
      role: "provider",
      name: "Juan",
      surname: "Pérez",
      category_name: "Plomería",
    },
    messages: [
      {
        id: 100,
        sender_role: "consumer",
        content: "Hola Juan",
        created_on: new Date().toISOString(),
      },
    ],
    updated_on: new Date().toISOString(),
  });

  await this.page.goto(APP_URL + ROUTES.consumer.messages + "?provider_id=1");
  await this.page.waitForLoadState("networkidle");
});

Then("puedo enviar mensajes adicionales al prestador", async function (this: CustomWorld) {
  const input = this.page.getByPlaceholder("Escribe un mensaje...");
  await input.waitFor({ state: "visible" });

  const inputValue = await input.inputValue();
  assert.ok(inputValue.length > 0, "El campo de mensaje está vacío");

  const sendButton = this.page.locator("button[type='button']").filter({ has: this.page.locator("svg") }).last();
  await sendButton.waitFor({ state: "visible" });
  const isDisabled = await sendButton.getAttribute("disabled");
  assert.ok(isDisabled === null, "El botón de enviar está deshabilitado");
});
