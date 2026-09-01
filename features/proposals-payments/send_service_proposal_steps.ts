import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, APP_URL } from "../support/world";
import { ROUTES } from "../../lib/routes";
import { aConversation, aConversationDetail, aCounterpart, aProposal, aWorkOrder, aBookingTerms, anApiError } from "../support/factories";

async function setupChatWithStatus(world: CustomWorld, status: "accepted" | "pending") {
  await world.setSession("provider", {
    id: "provider-001",
    email: "prestador@loresuelvo.test",
    firstName: "Paula",
    lastName: "Rios",
    isOnboarded: true,
  });

  await world.stubGet("/conversations", [
    aConversation({
      id: 1,
      status,
      counterpart: aCounterpart({
        id: 10,
        role: "consumer",
        name: "María",
        surname: "Fernández",
        category_name: "Plomería",
      }),
      updated_on: new Date().toISOString(),
    }),
  ]);

  await world.stubGet(
    "/conversations/1",
    aConversationDetail({
      id: 1,
      status,
      counterpart: aCounterpart({
        id: 10,
        role: "consumer",
        name: "María",
        surname: "Fernández",
        category_name: "Plomería",
      }),
      messages: [],
      updated_on: new Date().toISOString(),
    })
  );

  await world.stubGet("/job-requests", []);
  await world.stubGet("/service-proposals", []);

  await world.page.goto(APP_URL + ROUTES.provider.messages + "?consumer_id=10", { waitUntil: "domcontentloaded" });
  await world.page.waitForTimeout(500);
}

Given("que estoy en el chat del prestador con un consumidor activo", async function (this: CustomWorld) {
  await setupChatWithStatus(this, "accepted");
});

Given("que estoy en el chat del prestador con un consumidor pendiente", async function (this: CustomWorld) {
  await setupChatWithStatus(this, "pending");
});

When("visualizo la barra de entrada de mensajes", async function (this: CustomWorld) {
  const input = this.page.getByPlaceholder("Escribe un mensaje...");
  await input.waitFor({ state: "visible" });
  assert.ok(await input.isVisible(), "No se visualiza la barra de entrada de mensajes");
});

Then("veo un botón {string} para abrir el menú de acciones", async function (this: CustomWorld, buttonLabel: string) {
  const button = this.page.getByLabel("Abrir menú de acciones");
  await button.waitFor({ state: "visible" });
  assert.ok(await button.isVisible(), "No se visualiza el botón '+' de acciones");
});

When("hago clic en el botón {string} del menú de acciones", async function (this: CustomWorld, buttonLabel: string) {
  const button = this.page.getByLabel("Abrir menú de acciones");
  await button.waitFor({ state: "visible" });
  const menu = this.page.getByRole("menu");
  for (let i = 0; i < 5; i++) {
    await button.click();
    try {
      await menu.waitFor({ state: "visible", timeout: 1000 });
      break;
    } catch {
      await this.page.waitForTimeout(500);
    }
  }
});

Then("veo las opciones {string} y {string}", async function (this: CustomWorld, option1: string, option2: string) {
  const opt1 = this.page.getByRole("menuitem", { name: option1 });
  const opt2 = this.page.getByRole("menuitem", { name: option2 });
  await opt1.waitFor({ state: "visible" });
  await opt2.waitFor({ state: "visible" });
  assert.ok(await opt1.isVisible(), `No se visualiza la opción ${option1}`);
  assert.ok(await opt2.isVisible(), `No se visualiza la opción ${option2}`);
});

When("abro el formulario de propuesta desde el menú de acciones", async function (this: CustomWorld) {
  const button = this.page.getByLabel("Abrir menú de acciones");
  await button.waitFor({ state: "visible" });

  const menu = this.page.getByRole("menu");
  for (let i = 0; i < 5; i++) {
    await button.click();
    try {
      await menu.waitFor({ state: "visible", timeout: 1000 });
      break;
    } catch {
      await this.page.waitForTimeout(500);
    }
  }

  const option = this.page.getByRole("menuitem", { name: "Crear propuesta de servicio" });
  await option.waitFor({ state: "visible" });
  await option.click();
});

Then("se abre el modal de propuesta {string}", async function (this: CustomWorld, title: string) {
  const modal = this.page.getByRole("dialog", { name: title });
  await modal.waitFor({ state: "visible" });
  assert.ok(await modal.isVisible(), `No se abrió el modal "${title}"`);
});

Then(
  "veo los campos obligatorios {string}, {string}, {string} y {string}",
  async function (this: CustomWorld, campo1: string, campo2: string, campo3: string, campo4: string) {
    const modal = this.page.getByRole("dialog", { name: "Propuesta de Servicio" });

    for (const campo of [campo1, campo2, campo3, campo4]) {
      const label = modal.getByText(campo, { exact: true });
      await label.waitFor({ state: "visible" });
      assert.ok(await label.isVisible(), `No se visualiza el campo ${campo}`);
    }
  }
);

Then(
  "veo los campos obligatorios {string}, {string}, {string}, {string} y {string}",
  async function (this: CustomWorld, c1: string, c2: string, c3: string, c4: string, c5: string) {
    const modal = this.page.getByRole("dialog", { name: "Propuesta de Servicio" });

    for (const campo of [c1, c2, c3, c4, c5]) {
      const label = modal.getByText(campo, { exact: true });
      await label.waitFor({ state: "visible" });
      assert.ok(await label.isVisible(), `No se visualiza el campo ${campo}`);
    }
  }
);

Given("que tengo abierto el formulario de propuesta de servicio", async function (this: CustomWorld) {
  await setupChatWithStatus(this, "accepted");

  const button = this.page.getByLabel("Abrir menú de acciones");
  await button.waitFor({ state: "visible" });

  const menu = this.page.getByRole("menu");
  for (let i = 0; i < 5; i++) {
    await button.click();
    try {
      await menu.waitFor({ state: "visible", timeout: 1000 });
      break;
    } catch {
      await this.page.waitForTimeout(500);
    }
  }

  const option = this.page.getByRole("menuitem", { name: "Crear propuesta de servicio" });
  await option.waitFor({ state: "visible" });
  await option.click();

  const modal = this.page.getByRole("dialog", { name: "Propuesta de Servicio" });
  await modal.waitFor({ state: "visible" });
});

async function fillAndSubmitProposalForm(
  world: CustomWorld,
  monto: string,
  duracion: string,
  motivo: string
) {
  const targetDateInfo = await world.page.evaluate(() => {
    const today = new Date();
    const target = new Date(today);
    target.setDate(today.getDate() + 5);
    target.setHours(12, 0, 0, 0);

    return {
      iso: target.toISOString(),
      currentMonth: today.getFullYear() * 12 + today.getMonth(),
      targetMonth: target.getFullYear() * 12 + target.getMonth(),
      dataDay: target.toLocaleDateString(navigator.language),
    };
  });
  const targetDate = new Date(targetDateInfo.iso);
  const alreadyStubbed = await world.hasApiStub("POST", "/service-proposals");
  if (!alreadyStubbed) {
    const amountCents = parseFloat(monto) * 100;
    const futureDate = targetDate.toISOString();
    const deadlineDate = new Date(Date.now() + 86400000 * 4).toISOString();
    await world.stubPost(
      "/service-proposals",
      201,
      aProposal("provider", {
        id: 10,
        conversation_id: 1,
        consumer_id: 10,
        provider_id: 1,
        amount_cents: amountCents,
        scheduled_on: futureDate,
        description: motivo,
        estimated_duration_minutes: parseInt(duracion, 10),
        status: "pending",
        booking_terms: aBookingTerms(amountCents, {
          deposit_cents: Math.round(parseFloat(monto) * 20),
          remaining_service_balance_cents: Math.round(parseFloat(monto) * 80),
          platform_fee_total_cents: Math.round(parseFloat(monto) * 10),
          platform_fee_due_now_cents: Math.round(parseFloat(monto) * 2),
          remaining_platform_fee_cents: Math.round(parseFloat(monto) * 8),
          amount_due_now_cents: Math.round(parseFloat(monto) * 22),
          remaining_amount_due_cents: Math.round(parseFloat(monto) * 88),
          contract_total_cents: Math.round(parseFloat(monto) * 110),
          booking_payment_deadline: deadlineDate,
        }),
      })
    );
  }

  const modal = world.page.getByRole("dialog", { name: "Propuesta de Servicio" });

  const inputMonto = modal.getByPlaceholder("Ej: 15000.50");
  await inputMonto.fill(monto);

  const dateTrigger = modal.getByRole("button", { name: /Seleccionar|\d{2}\/\d{2}\/\d{4}/ });
  await dateTrigger.click();

  if (targetDateInfo.targetMonth !== targetDateInfo.currentMonth) {
    const nextMonthButton = world.page.locator("button.rdp-button_next").first();
    await nextMonthButton.waitFor({ state: "visible" });
    assert.ok(!(await nextMonthButton.isDisabled()), "El mes siguiente debería estar habilitado");
    await nextMonthButton.click();
  }

  const futureDay = world.page.locator(`button[data-day="${targetDateInfo.dataDay}"]`).first();
  await futureDay.waitFor({ state: "visible" });
  assert.ok(!(await futureDay.isDisabled()), `La fecha futura ${targetDateInfo.dataDay} no está habilitada`);
  await futureDay.click();

  const timeTrigger = modal.getByRole("combobox", { name: "Hora" });
  await timeTrigger.click();
  const timeOption = world.page.getByRole("option", { name: "12:00", exact: true });
  await timeOption.waitFor({ state: "visible" });
  await timeOption.click();

  const durationTrigger = modal.getByLabel("Duración estimada");
  await durationTrigger.waitFor({ state: "visible" });
  await durationTrigger.click();

  const presetLabels: Record<string, string> = {
    "15": "15 min",
    "30": "30 min",
    "45": "45 min",
    "60": "1 hora",
    "90": "1 h 30 min",
    "120": "2 horas",
    "150": "2 h 30 min",
    "180": "3 horas",
    "240": "4 horas",
    "300": "5 horas",
    "360": "6 horas",
    "480": "8 horas (Jornada completa)",
  };

  const presetLabel = presetLabels[duracion];
  if (presetLabel) {
    const option = world.page.getByRole("option", { name: presetLabel, exact: true });
    await option.waitFor({ state: "visible" });
    await option.click();
  } else {
    const customOption = world.page.getByRole("option", { name: "Personalizada...", exact: true });
    await customOption.waitFor({ state: "visible" });
    await customOption.click();

    const customInput = modal.getByPlaceholder("En minutos (ej: 90)");
    await customInput.waitFor({ state: "visible" });
    await customInput.fill(duracion);
  }

  const inputMotivo = modal.getByPlaceholder("Ej: Reparación de pérdida de agua en cocina con materiales incluidos.");
  await inputMotivo.fill(motivo);

  const submitButton = modal.getByRole("button", { name: "Enviar propuesta" });
  assert.ok(!(await submitButton.isDisabled()), "El botón de envío debería estar habilitado para una propuesta válida");
  await submitButton.click();

  const confirmButton = world.page.getByRole("button", { name: "Sí, enviar propuesta" });
  await confirmButton.waitFor({ state: "visible" });
  await confirmButton.click();
}

When(
  "completo y envío la propuesta con monto {string}, fecha futura y motivo {string}",
  async function (this: CustomWorld, monto: string, motivo: string) {
    await fillAndSubmitProposalForm(this, monto, "60", motivo);
  }
);

When(
  "completo y envío la propuesta con monto {string}, fecha futura, duración de {string} minutos y motivo {string}",
  async function (this: CustomWorld, monto: string, duracion: string, motivo: string) {
    await fillAndSubmitProposalForm(this, monto, duracion, motivo);
  }
);

Then("veo un indicador de éxito informando que la propuesta fue enviada", async function (this: CustomWorld) {
  const modal = this.page.getByRole("dialog", { name: "Propuesta de Servicio" });
  const successIndicator = modal.getByText("Propuesta enviada exitosamente. El consumidor fue notificado.");
  await successIndicator.waitFor({ state: "visible" });
  assert.ok(await successIndicator.isVisible(), "No se muestra el indicador de éxito");
});

Then("el formulario se cierra", async function (this: CustomWorld) {
  const modal = this.page.getByRole("dialog", { name: "Propuesta de Servicio" });
  await modal.waitFor({ state: "hidden", timeout: 5000 });
  assert.ok(!(await modal.isVisible()), "El modal no se cerró");
});

When("intento enviar la propuesta sin completar todos los campos", async function (this: CustomWorld) {
  const modal = this.page.getByRole("dialog", { name: "Propuesta de Servicio" });

  const inputMonto = modal.getByPlaceholder("Ej: 15000.50");
  await inputMonto.fill("");

  const inputMotivo = modal.getByPlaceholder("Ej: Reparación de pérdida de agua en cocina con materiales incluidos.");
  await inputMotivo.fill("");
});

When(
  "ingreso monto {string}, fecha futura y motivo {string} pero dejo la duración estimada vacía",
  async function (this: CustomWorld, monto: string, motivo: string) {
    const modal = this.page.getByRole("dialog", { name: "Propuesta de Servicio" });
    const inputMonto = modal.getByPlaceholder("Ej: 15000.50");
    await inputMonto.fill(monto);

    const inputMotivo = modal.getByPlaceholder("Ej: Reparación de pérdida de agua en cocina con materiales incluidos.");
    await inputMotivo.fill(motivo);
  }
);

When("ingreso una duración estimada de {string} minutos", async function (this: CustomWorld, duracion: string) {
  const modal = this.page.getByRole("dialog", { name: "Propuesta de Servicio" });
  const durationTrigger = modal.getByLabel("Duración estimada");
  await durationTrigger.waitFor({ state: "visible" });
  await durationTrigger.click();

  const presetLabels: Record<string, string> = {
    "15": "15 min",
    "30": "30 min",
    "45": "45 min",
    "60": "1 hora",
    "90": "1 h 30 min",
    "120": "2 horas",
    "150": "2 h 30 min",
    "180": "3 horas",
    "240": "4 horas",
    "300": "5 horas",
    "360": "6 horas",
    "480": "8 horas (Jornada completa)",
  };

  const presetLabel = presetLabels[duracion];
  if (presetLabel) {
    const option = this.page.getByRole("option", { name: presetLabel, exact: true });
    await option.waitFor({ state: "visible" });
    await option.click();
  } else {
    const customOption = this.page.getByRole("option", { name: "Personalizada...", exact: true });
    await customOption.waitFor({ state: "visible" });
    await customOption.click();

    const customInput = modal.getByPlaceholder("En minutos (ej: 90)");
    await customInput.waitFor({ state: "visible" });
    await customInput.fill(duracion);
  }
});

Then("veo un mensaje de error indicando que la duración mínima es de 15 minutos", async function (this: CustomWorld) {
  const modal = this.page.getByRole("dialog", { name: "Propuesta de Servicio" });
  const errorMsg = modal.getByText("La duración mínima es de 15 minutos.");
  await errorMsg.waitFor({ state: "visible" });
  assert.ok(await errorMsg.isVisible(), "No se muestra el error de duración mínima");
});

Then("veo un mensaje de error indicando que la duración máxima es de 24 horas", async function (this: CustomWorld) {
  const modal = this.page.getByRole("dialog", { name: "Propuesta de Servicio" });
  const errorMsg = modal.getByText(/La duración máxima es de 24 horas/);
  await errorMsg.waitFor({ state: "visible" });
  assert.ok(await errorMsg.isVisible(), "No se muestra el error de duración máxima");
});

Then("el botón de envío permanece deshabilitado", async function (this: CustomWorld) {
  const modal = this.page.getByRole("dialog", { name: "Propuesta de Servicio" });
  const submitButton = modal.getByRole("button", { name: "Enviar propuesta" });
  const isDisabled = await submitButton.isDisabled();
  assert.ok(isDisabled, "El botón de envío no está deshabilitado");
});

When("ingreso un monto de {string} en el campo de monto", async function (this: CustomWorld, monto: string) {
  const modal = this.page.getByRole("dialog", { name: "Propuesta de Servicio" });
  const inputMonto = modal.getByPlaceholder("Ej: 15000.50");
  await inputMonto.fill(monto);
});

Then("veo un mensaje de error indicando que el monto debe ser mayor a cero", async function (this: CustomWorld) {
  const modal = this.page.getByRole("dialog", { name: "Propuesta de Servicio" });
  const errorMsg = modal.getByText("El monto debe ser mayor a cero.");
  await errorMsg.waitFor({ state: "visible" });
  assert.ok(await errorMsg.isVisible(), "No se muestra el error de monto inválido");
});

When("selecciono una fecha y hora en el pasado", async function (this: CustomWorld) {
  const modal = this.page.getByRole("dialog", { name: "Propuesta de Servicio" });
  const dateTrigger = modal.getByRole("button", { name: /Seleccionar|\d{2}\/\d{2}\/\d{4}/ });
  await dateTrigger.click();

  const prevMonthButton = this.page.locator("button.rdp-button_previous").first();
  await prevMonthButton.waitFor({ state: "visible" });
  await prevMonthButton.click();

  const pastDay = this.page.locator("button").filter({ hasText: /^15$/ }).first();
  await pastDay.waitFor({ state: "visible" });
  await pastDay.click();

  const timeTrigger = modal.getByRole("combobox", { name: "Hora" });
  await timeTrigger.click();
  const timeOption = this.page.getByRole("option", { name: "12:00", exact: true });
  await timeOption.waitFor({ state: "visible" });
  await timeOption.click();
});

Then("veo un mensaje de error indicando que la fecha debe ser futura", async function (this: CustomWorld) {
  const modal = this.page.getByRole("dialog", { name: "Propuesta de Servicio" });
  const errorMsg = modal.getByText("La fecha y hora deben ser futuras.");
  await errorMsg.waitFor({ state: "visible" });
  assert.ok(await errorMsg.isVisible(), "No se muestra el error de fecha pasada");
});

Given("el servicio de propuestas no está disponible", async function (this: CustomWorld) {
  await this.stubPost("/service-proposals", 500, anApiError("Internal Server Error"));
});

Then("veo un mensaje de error indicando el problema", async function (this: CustomWorld) {
  const modal = this.page.getByRole("dialog", { name: "Propuesta de Servicio" });
  const errorMsg = modal.getByText("Hubo un problema al enviar la propuesta. Por favor intenta de nuevo.");
  await errorMsg.waitFor({ state: "visible" });
  assert.ok(await errorMsg.isVisible(), "No se muestra el error de servicio no disponible");
});

Then("no veo la opción de acción {string}", async function (this: CustomWorld, optionName: string) {
  const option = this.page.getByRole("menuitem", { name: optionName });
  assert.ok(!(await option.isVisible()), `Se visualiza la opción deshabilitada/inexistente ${optionName}`);
});

Then("veo la opción de acción {string}", async function (this: CustomWorld, optionName: string) {
  const option = this.page.getByRole("menuitem", { name: optionName });
  await option.waitFor({ state: "visible" });
  assert.ok(await option.isVisible(), `No se visualiza la opción ${optionName}`);
});

Given(
  "que soy un consumidor con una propuesta recibida con duración estimada de {string} minutos",
  async function (this: CustomWorld, duracion: string) {
    await this.setSession("consumer", {
      id: "consumer-001",
      email: "consumidor@loresuelvo.test",
      firstName: "Ana",
      lastName: "Pérez",
      isOnboarded: true,
    });

    const proposal = aProposal("consumer", {
      id: 42,
      conversation_id: 1,
      consumer_id: 10,
      provider_id: 1,
      amount_cents: 1500000,
      scheduled_on: "2026-08-20T10:00:00Z",
      description: "Reparación de cañería en cocina",
      estimated_duration_minutes: parseInt(duracion, 10),
      status: "pending",
    });

    await this.stubGet("/service-proposals", [proposal]);
    await this.stubGet("/service-proposals/42", proposal);
    await this.stubGet("/conversations", [
      aConversation({
        id: 1,
        status: "accepted",
        counterpart: aCounterpart({
          id: 1,
          role: "provider",
          name: "Juan",
          surname: "Gómez",
          category_name: "Plomería",
        }),
      }),
    ]);
    await this.stubGet(
      "/conversations/1",
      aConversationDetail({
        id: 1,
        status: "accepted",
        counterpart: aCounterpart({
          id: 1,
          role: "provider",
          name: "Juan",
          surname: "Gómez",
          category_name: "Plomería",
        }),
        messages: [],
      })
    );

    await this.page.goto(APP_URL + ROUTES.consumer.messages + "?provider_id=1", { waitUntil: "domcontentloaded" });
  }
);

Given(
  "que soy un prestador con una propuesta enviada con duración estimada de {string} minutos",
  async function (this: CustomWorld, duracion: string) {
    await this.setSession("provider", {
      id: "provider-001",
      email: "prestador@loresuelvo.test",
      firstName: "Juan",
      lastName: "Gómez",
      isOnboarded: true,
    });

    const proposal = aProposal("provider", {
      id: 42,
      conversation_id: 1,
      consumer_id: 10,
      provider_id: 1,
      amount_cents: 1500000,
      scheduled_on: "2026-08-20T10:00:00Z",
      description: "Reparación de cañería en cocina",
      estimated_duration_minutes: parseInt(duracion, 10),
      status: "pending",
    });

    await this.stubGet("/service-proposals", [proposal]);
    await this.stubGet("/service-proposals/42", proposal);
    await this.stubGet("/conversations", [
      aConversation({
        id: 1,
        status: "accepted",
        counterpart: aCounterpart({
          id: 10,
          role: "consumer",
          name: "Ana",
          surname: "Pérez",
        }),
      }),
    ]);
    await this.stubGet(
      "/conversations/1",
      aConversationDetail({
        id: 1,
        status: "accepted",
        counterpart: aCounterpart({
          id: 10,
          role: "consumer",
          name: "Ana",
          surname: "Pérez",
        }),
        messages: [],
      })
    );

    await this.page.goto(APP_URL + ROUTES.provider.messages + "?consumer_id=10", { waitUntil: "domcontentloaded" });
  }
);

When("abro el detalle de la propuesta de servicio", async function (this: CustomWorld) {
  const proposalButton = this.page.getByRole("button", { name: /ver propuesta|revisar|ver detalle/i }).first();
  await proposalButton.waitFor({ state: "visible" });
  await proposalButton.click();
});

Then(
  "veo la duración estimada {string} en la información del servicio",
  async function (this: CustomWorld, expectedDuration: string) {
    const durationField = this.page.getByTestId("proposal-duration-info");
    await durationField.waitFor({ state: "visible" });
    const text = await durationField.textContent();
    assert.ok(text?.includes(expectedDuration), `Se esperaba ver "${expectedDuration}" pero se encontró "${text}"`);
  }
);

Given(
  "que soy un consumidor autenticado con una orden de trabajo programada con duración estimada de {string} minutos",
  async function (this: CustomWorld, duracion: string) {
    await this.setSession("consumer", {
      id: "consumer-001",
      email: "consumidor@loresuelvo.test",
      firstName: "Ana",
      lastName: "Pérez",
      isOnboarded: true,
    });

    const workOrder = aWorkOrder({
      id: 10,
      service_proposal_id: 42,
      status: "scheduled",
      amount_cents: 1500000,
      scheduled_on: "2026-08-20T10:00:00Z",
      description: "Reparación de cañería en cocina",
      estimated_duration_minutes: parseInt(duracion, 10),
    });

    await this.stubGet("/work-orders/10", workOrder);
    await this.stubGet("/work-orders?service_proposal_id=42", workOrder);

    const proposal = aProposal("consumer", {
      id: 42,
      status: "accepted",
      estimated_duration_minutes: parseInt(duracion, 10),
    });

    await this.stubGet("/service-proposals", [proposal]);
    await this.stubGet("/service-proposals/42", proposal);
    await this.stubGet("/conversations", [
      aConversation({
        id: 1,
        status: "accepted",
        counterpart: aCounterpart({
          id: 1,
          role: "provider",
          name: "Juan",
          surname: "Gómez",
          category_name: "Plomería",
        }),
      }),
    ]);
    await this.stubGet(
      "/conversations/1",
      aConversationDetail({
        id: 1,
        status: "accepted",
        counterpart: aCounterpart({
          id: 1,
          role: "provider",
          name: "Juan",
          surname: "Gómez",
          category_name: "Plomería",
        }),
        messages: [],
      })
    );

    await this.page.goto(APP_URL + ROUTES.consumer.messages + "?provider_id=1", { waitUntil: "domcontentloaded" });
  }
);

Then(
  "veo la duración estimada {string} en los datos acordados de la orden",
  async function (this: CustomWorld, expectedDuration: string) {
    const durationField = this.page.getByTestId("work-order-duration-info");
    await durationField.waitFor({ state: "visible" });
    const text = await durationField.textContent();
    assert.ok(text?.includes(expectedDuration), `Se esperaba ver "${expectedDuration}" pero se encontró "${text}"`);
  }
);

