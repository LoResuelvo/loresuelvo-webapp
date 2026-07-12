import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { page } from "./landing_page_visualization_steps";
import { ROUTES } from "../../lib/routes";
import { AuthSession } from "../../infrastructure/auth/types";
import { MOCK_SESSION_COOKIE } from "../../infrastructure/auth/mock-adapter";
import { addApiStub, hasApiStub } from "./stubs-helper";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

async function setProviderSession() {
  const session: AuthSession = {
    user: {
      id: "provider-001",
      email: "prestador@loresuelvo.test",
      firstName: "Paula",
      lastName: "Rios",
      isOnboarded: true,
      role: "provider",
    },
    accessToken: "mock-access-token",
  };

  await page.context().addCookies([{
    name: MOCK_SESSION_COOKIE,
    value: encodeURIComponent(JSON.stringify(session)),
    domain: "localhost",
    path: "/",
  }]);
}

async function setupChatWithStatus(status: "accepted" | "pending") {
  await setProviderSession();

  await addApiStub({
    method: "GET",
    endpoint: "/conversations",
    status: 200,
    body: [
      {
        id: 1,
        status: status,
        counterpart: { id: 10, role: "consumer", name: "María", surname: "Fernández", category_name: "Plomería" },
        last_message: null,
        updated_on: new Date().toISOString(),
      }
    ],
  });

  await addApiStub({
    method: "GET",
    endpoint: "/conversations/1",
    status: 200,
    body: {
      id: 1,
      status: status,
      counterpart: { id: 10, role: "consumer", name: "María", surname: "Fernández", category_name: "Plomería" },
      messages: [],
      updated_on: new Date().toISOString(),
    },
  });

  await addApiStub({
    method: "GET",
    endpoint: "/job-requests?conversation_id=1",
    status: 200,
    body: null,
  });

  await page.goto(APP_URL + ROUTES.provider.messages + "?consumer_id=10", { waitUntil: "networkidle" });
}

Given("que estoy en el chat del prestador con un consumidor activo", async () => {
  await setupChatWithStatus("accepted");
});

Given("que estoy en el chat del prestador con un consumidor pendiente", async () => {
  await setupChatWithStatus("pending");
});

When("visualizo la barra de entrada de mensajes", async () => {
  const input = page.getByPlaceholder("Escribe un mensaje...");
  await input.waitFor({ state: "visible" });
  assert.ok(await input.isVisible(), "No se visualiza la barra de entrada de mensajes");
});

Then("veo un botón {string} para abrir el menú de acciones", async (buttonLabel: string) => {
  const button = page.getByLabel("Abrir menú de acciones");
  await button.waitFor({ state: "visible" });
  assert.ok(await button.isVisible(), "No se visualiza el botón '+' de acciones");
});

When("hago clic en el botón {string} del menú de acciones", async (buttonLabel: string) => {
  const button = page.getByLabel("Abrir menú de acciones");
  await button.waitFor({ state: "visible" });
  await button.click();
});

Then("veo las opciones {string} y {string}", async (option1: string, option2: string) => {
  const opt1 = page.getByRole("menuitem", { name: option1 });
  const opt2 = page.getByRole("menuitem", { name: option2 });
  await opt1.waitFor({ state: "visible" });
  await opt2.waitFor({ state: "visible" });
  assert.ok(await opt1.isVisible(), `No se visualiza la opción ${option1}`);
  assert.ok(await opt2.isVisible(), `No se visualiza la opción ${option2}`);
});

When("abro el formulario de propuesta desde el menú de acciones", async () => {
  const button = page.getByLabel("Abrir menú de acciones");
  await button.waitFor({ state: "visible" });
  await button.click();

  const option = page.getByRole("menuitem", { name: "Crear propuesta de servicio" });
  await option.waitFor({ state: "visible" });
  await option.click();
});

Then("se abre el modal de propuesta {string}", async (title: string) => {
  const modal = page.getByRole("dialog", { name: title });
  await modal.waitFor({ state: "visible" });
  assert.ok(await modal.isVisible(), `No se abrió el modal "${title}"`);
});

Then("veo los campos obligatorios {string}, {string}, {string} y {string}", async (campo1: string, campo2: string, campo3: string, campo4: string) => {
  const modal = page.getByRole("dialog", { name: "Propuesta de Servicio" });
  
  const label1 = modal.getByText(campo1);
  const label2 = modal.getByText(campo2);
  const label3 = modal.getByText(campo3);
  const label4 = modal.getByText(campo4);

  await label1.waitFor({ state: "visible" });
  await label2.waitFor({ state: "visible" });
  await label3.waitFor({ state: "visible" });
  await label4.waitFor({ state: "visible" });

  assert.ok(await label1.isVisible(), `No se visualiza el campo ${campo1}`);
  assert.ok(await label2.isVisible(), `No se visualiza el campo ${campo2}`);
  assert.ok(await label3.isVisible(), `No se visualiza el campo ${campo3}`);
  assert.ok(await label4.isVisible(), `No se visualiza el campo ${campo4}`);
});

Given("que tengo abierto el formulario de propuesta de servicio", async () => {
  await setupChatWithStatus("accepted");
  
  const button = page.getByLabel("Abrir menú de acciones");
  await button.waitFor({ state: "visible" });
  await button.click();

  const option = page.getByRole("menuitem", { name: "Crear propuesta de servicio" });
  await option.waitFor({ state: "visible" });
  await option.click();

  const modal = page.getByRole("dialog", { name: "Propuesta de Servicio" });
  await modal.waitFor({ state: "visible" });
});

When("completo y envío la propuesta con monto {string}, fecha futura y motivo {string}", async (monto: string, motivo: string) => {
  const alreadyStubbed = await hasApiStub("POST", "/service-proposals");
  if (!alreadyStubbed) {
    await addApiStub({
      method: "POST",
      endpoint: "/service-proposals",
      status: 201,
      body: {
        id: 10,
        conversation_id: 1,
        consumer_id: 10,
        provider_id: 1,
        amount_cents: parseFloat(monto) * 100,
        scheduled_on: "2026-07-20T12:00:00Z",
        description: motivo,
        status: "pending",
      },
    });
  }

  const modal = page.getByRole("dialog", { name: "Propuesta de Servicio" });
  
  const inputMonto = modal.getByPlaceholder("Ej: 15000.50");
  await inputMonto.fill(monto);

  const dateTrigger = modal.getByRole("button", { name: /Seleccionar|\d{2}\/\d{2}\/\d{4}/ });
  await dateTrigger.click();
  const futureDay = page.locator('button').filter({ hasText: /^20$/ }).first();
  await futureDay.waitFor({ state: "visible" });
  await futureDay.click();

  const timeTrigger = modal.getByRole("combobox");
  await timeTrigger.click();
  const timeOption = page.getByRole("option", { name: "12:00", exact: true });
  await timeOption.waitFor({ state: "visible" });
  await timeOption.click();

  const inputMotivo = modal.getByPlaceholder("Ej: Reparación de pérdida de agua en cocina con materiales incluidos.");
  await inputMotivo.fill(motivo);

  const submitButton = modal.getByRole("button", { name: "Enviar propuesta" });
  await submitButton.click();

  const confirmButton = page.getByRole("button", { name: "Sí, enviar propuesta" });
  await confirmButton.waitFor({ state: "visible" });
  await confirmButton.click();
});

Then("veo un indicador de éxito informando que la propuesta fue enviada", async () => {
  const modal = page.getByRole("dialog", { name: "Propuesta de Servicio" });
  const successIndicator = modal.getByText("Propuesta enviada exitosamente. El consumidor fue notificado.");
  await successIndicator.waitFor({ state: "visible" });
  assert.ok(await successIndicator.isVisible(), "No se muestra el indicador de éxito");
});

Then("el formulario se cierra", async () => {
  const modal = page.getByRole("dialog", { name: "Propuesta de Servicio" });
  await modal.waitFor({ state: "hidden", timeout: 5000 });
  assert.ok(!(await modal.isVisible()), "El modal no se cerró");
});

When("intento enviar la propuesta sin completar todos los campos", async () => {
  const modal = page.getByRole("dialog", { name: "Propuesta de Servicio" });
  
  const inputMonto = modal.getByPlaceholder("Ej: 15000.50");
  await inputMonto.fill("");

  const inputMotivo = modal.getByPlaceholder("Ej: Reparación de pérdida de agua en cocina con materiales incluidos.");
  await inputMotivo.fill("");
});

Then("el botón de envío permanece deshabilitado", async () => {
  const modal = page.getByRole("dialog", { name: "Propuesta de Servicio" });
  const submitButton = modal.getByRole("button", { name: "Enviar propuesta" });
  const isDisabled = await submitButton.isDisabled();
  assert.ok(isDisabled, "El botón de envío no está deshabilitado");
});

When("ingreso un monto de {string} en el campo de monto", async (monto: string) => {
  const modal = page.getByRole("dialog", { name: "Propuesta de Servicio" });
  const inputMonto = modal.getByPlaceholder("Ej: 15000.50");
  await inputMonto.fill(monto);
});

Then("veo un mensaje de error indicando que el monto debe ser mayor a cero", async () => {
  const modal = page.getByRole("dialog", { name: "Propuesta de Servicio" });
  const errorMsg = modal.getByText("El monto debe ser mayor a cero.");
  await errorMsg.waitFor({ state: "visible" });
  assert.ok(await errorMsg.isVisible(), "No se muestra el error de monto inválido");
});

When("selecciono una fecha y hora en el pasado", async () => {
  const modal = page.getByRole("dialog", { name: "Propuesta de Servicio" });
  const dateTrigger = modal.getByRole("button", { name: /Seleccionar|\d{2}\/\d{2}\/\d{4}/ });
  await dateTrigger.click();
  const pastDay = page.locator('button').filter({ hasText: /^1$/ }).first();
  await pastDay.waitFor({ state: "visible" });
  await pastDay.click();

  const timeTrigger = modal.getByRole("combobox");
  await timeTrigger.click();
  const timeOption = page.getByRole("option", { name: "12:00", exact: true });
  await timeOption.waitFor({ state: "visible" });
  await timeOption.click();
});

Then("veo un mensaje de error indicando que la fecha debe ser futura", async () => {
  const modal = page.getByRole("dialog", { name: "Propuesta de Servicio" });
  const errorMsg = modal.getByText("La fecha y hora deben ser futuras.");
  await errorMsg.waitFor({ state: "visible" });
  assert.ok(await errorMsg.isVisible(), "No se muestra el error de fecha pasada");
});

Given("el servicio de propuestas no está disponible", async () => {
  await addApiStub({
    method: "POST",
    endpoint: "/service-proposals",
    status: 500,
    body: { error: "Internal Server Error" },
  });
});

Then("veo un mensaje de error indicando el problema", async () => {
  const modal = page.getByRole("dialog", { name: "Propuesta de Servicio" });
  const errorMsg = modal.getByText("Hubo un problema al enviar la propuesta. Por favor intenta de nuevo.");
  await errorMsg.waitFor({ state: "visible" });
  assert.ok(await errorMsg.isVisible(), "No se muestra el error de servicio no disponible");
});

Then("no veo la opción de acción {string}", async (optionName: string) => {
  const option = page.getByRole("menuitem", { name: optionName });
  assert.ok(!(await option.isVisible()), `Se visualiza la opción deshabilitada/inexistente ${optionName}`);
});

Then("veo la opción de acción {string}", async (optionName: string) => {
  const option = page.getByRole("menuitem", { name: optionName });
  await option.waitFor({ state: "visible" });
  assert.ok(await option.isVisible(), `No se visualiza la opción ${optionName}`);
});
