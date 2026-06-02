import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { page } from "./landing_page_visualization_steps";
import { ROUTES } from "../../lib/routes";
import { addApiStub } from "./stubs-helper";
import { setConsumerSession } from "./initiate_chat_with_provider_steps";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

Given("existe el rubro Plomería", async () => {
  await addApiStub({
    method: "GET",
    endpoint: "/categories",
    status: 200,
    body: [
      { id: 1, name: "Plomería"}
    ]
  });
});

Given("estoy en el listado de técnicos del rubro {string}", async (categoryName: string) => {
  await page.goto(APP_URL + ROUTES.consumer.buscar + "?category_id=1");
  await page.waitForLoadState("networkidle");
});

When("hago clic en el botón {string} del prestador {string}", async (buttonText: string, providerName: string) => {
  const card = page.locator("div.bg-white").filter({ hasText: providerName }).first();
  await card.waitFor({ state: "visible" });
  const button = card.getByRole("button", { name: buttonText }).or(card.getByRole("link", { name: buttonText }));
  await button.waitFor({ state: "visible" });
  await button.click();
});

Then("se abre el modal {string}", async (modalTitle: string) => {
  const modalHeader = page.getByRole("heading", { name: modalTitle }).first();
  await modalHeader.waitFor({ state: "visible" });
  assert.ok(await modalHeader.isVisible(), `No se abrió el modal "${modalTitle}"`);
});

Then("veo el nombre del prestador {string}", async (providerName: string) => {
  const providerInModal = page.locator("form").getByText(providerName).first();
  await providerInModal.waitFor({ state: "visible" });
  assert.ok(await providerInModal.isVisible(), `No se ve el nombre del prestador "${providerName}" en el modal`);
});

Then("veo los campos obligatorios {string} y {string}", async (field1: string, field2: string) => {
  const label1 = page.locator("form").getByText(field1, { exact: false }).first();
  const label2 = page.locator("form").getByText(field2, { exact: false }).first();
  await label1.waitFor({ state: "visible" });
  await label2.waitFor({ state: "visible" });
  assert.ok(await label1.isVisible(), `No se ve el campo ${field1}`);
  assert.ok(await label2.isVisible(), `No se ve el campo ${field2}`);
});

Given("que tengo abierta la ventana modal {string} para {string}", async (modalTitle: string, providerName: string) => {
  await setConsumerSession();
  
  await addApiStub({
    method: "GET",
    endpoint: "/categories",
    status: 200,
    body: [
      { id: 1, name: "Plomería"}
    ]
  });

  await addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: []
  });

  await addApiStub({
    method: "POST",
    endpoint: "/job-requests",
    status: 201,
    body: {
      id: 1,
      conversation_id: 1,
      title: "Pérdida de agua en termotanque",
      description: "El termotanque pierde agua por la base. El agua se acumula y el piloto se apaga."
    }
  });

  await addApiStub({
    method: "GET",
    endpoint: "/conversations/1",
    status: 200,
    body: {
      id: 1,
      status: "pending",
      counterpart: {
        id: 1,
        role: "provider",
        name: "Juan",
        surname: "Pérez",
        category_name: "Plomería"
      },
      messages: [
        {
          id: 100,
          sender_role: "consumer",
          content: "Título: Pérdida de agua en termotanque\n\nDescripción: El termotanque pierde agua por la base. El agua se acumula y el piloto se apaga.",
          created_on: new Date().toISOString()
        }
      ],
      updated_on: new Date().toISOString()
    }
  });

  await page.goto(APP_URL + ROUTES.consumer.buscar + "?category_id=1");
  await page.waitForLoadState("networkidle");

  const card = page.locator("div.bg-white").filter({ hasText: providerName }).first();
  await card.waitFor({ state: "visible" });
  const button = card.getByRole("button", { name: "Contactar" });
  await button.waitFor({ state: "visible" });
  await button.click();

  const modalHeader = page.getByRole("heading", { name: modalTitle }).first();
  await modalHeader.waitFor({ state: "visible" });
});

When("ingreso un titulo, una descripcion y toco el boton {string}", async (btnText: string) => {
  const titleInput = page.getByPlaceholder(/Pérdida de agua/i).first();
  await titleInput.waitFor({ state: "visible" });
  await titleInput.fill("Pérdida de agua en termotanque");

  const descInput = page.getByPlaceholder(/El termotanque pierde agua/i).first();
  await descInput.waitFor({ state: "visible" });
  await descInput.fill("El termotanque pierde agua por la base. El agua se acumula y el piloto se apaga.");

  const button = page.getByRole("button", { name: btnText }).first();
  await button.waitFor({ state: "visible" });
  await button.click();
});

Then("soy redirigido a la pantalla de mensajes con {string}", async (providerName: string) => {
  await page.waitForURL(`**${ROUTES.consumer.messages}**`);
  assert.ok(page.url().includes(ROUTES.consumer.messages), `Expected URL to contain ${ROUTES.consumer.messages}`);
});

Given("que ya envié la solicitud de trabajo a {string}", async (providerName: string) => {
  await setConsumerSession();

  await addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: [
      {
        id: 1,
        status: "pending",
        counterpart: {
          id: 1,
          role: "provider",
          name: "Juan",
          surname: "Pérez",
          category_name: "Plomería"
        },
        last_message: {
          id: 100,
          sender_role: "consumer",
          content: "Título: Pérdida de agua en termotanque\n\nDescripción: El termotanque pierde agua por la base.",
          created_on: new Date().toISOString()
        },
        updated_on: new Date().toISOString()
      }
    ]
  });

  await addApiStub({
    method: "GET",
    endpoint: "/conversations/1",
    status: 200,
    body: {
      id: 1,
      status: "pending",
      counterpart: {
        id: 1,
        role: "provider",
        name: "Juan",
        surname: "Pérez",
        category_name: "Plomería"
      },
      messages: [
        {
          id: 100,
          sender_role: "consumer",
          content: "Título: Pérdida de agua en termotanque\n\nDescripción: El termotanque pierde agua por la base.",
          created_on: new Date().toISOString()
        }
      ],
      updated_on: new Date().toISOString()
    }
  });
});

Then("visualizo al prestador {string} como contacto en mi lista", async (providerName: string) => {
  const contact = page.getByText(providerName).first();
  await contact.waitFor({ state: "visible" });
  assert.ok(await contact.isVisible(), `El prestador ${providerName} no aparece como contacto`);
});

Given("que inicié la conversación con {string}", async (providerName: string) => {
  await setConsumerSession();
  
  await addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: [
      {
        id: 1,
        status: "pending",
        counterpart: {
          id: 1,
          role: "provider",
          name: "Juan",
          surname: "Pérez",
          category_name: "Plomería"
        },
        last_message: {
          id: 100,
          sender_role: "consumer",
          content: "Hola Juan",
          created_on: new Date().toISOString()
        },
        updated_on: new Date().toISOString()
      }
    ]
  });

  await addApiStub({
    method: "GET",
    endpoint: "/conversations/1",
    status: 200,
    body: {
      id: 1,
      status: "pending",
      counterpart: {
        id: 1,
        role: "provider",
        name: "Juan",
        surname: "Pérez",
        category_name: "Plomería"
      },
      messages: [
        {
          id: 100,
          sender_role: "consumer",
          content: "Hola Juan",
          created_on: new Date().toISOString()
        }
      ],
      updated_on: new Date().toISOString()
    }
  });

  await page.goto(APP_URL + ROUTES.consumer.messages + "?provider_id=1");
  await page.waitForLoadState("networkidle");
});

Then("puedo enviar mensajes adicionales al prestador", async () => {
  const input = page.getByPlaceholder("Escribe un mensaje...");
  await input.waitFor({ state: "visible" });
  
  const inputValue = await input.inputValue();
  assert.ok(inputValue.length > 0, "El campo de mensaje está vacío");
  
  const sendButton = page.locator("button[type='button']").filter({ has: page.locator("svg") }).last();
  await sendButton.waitFor({ state: "visible" });
  const isDisabled = await sendButton.getAttribute("disabled");
  assert.ok(isDisabled === null, "El botón de enviar está deshabilitado");
});
