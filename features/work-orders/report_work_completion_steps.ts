import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { CustomWorld, APP_URL } from "../support/world";
import { ROUTES } from "../../lib/routes";
import {
  aProposal,
  aWorkOrder,
  aCounterpart,
  aPresignedUpload,
  aConfirmedFile,
  aCompletionReportSubmission,
  anApiError,
} from "../support/factories";

async function setupWorkOrderStubs(
  world: CustomWorld,
  scheduledOn: string = "2026-08-10T10:00:00Z"
) {
  await world.setSession("provider", {
    id: "provider-001",
    email: "prestador@loresuelvo.test",
    firstName: "Paula",
    lastName: "Rios",
    isOnboarded: true,
  });

  await world.stubGet("/service-proposals", [
    aProposal("provider", {
      id: 42,
      conversation_id: 1,
      consumer_id: 10,
      provider_id: 1,
      amount_cents: 1500000,
      scheduled_on: scheduledOn,
      description: "Reparación de cañería",
      status: "accepted",
      created_on: "2026-08-01T10:00:00Z",
      counterpart: aCounterpart({
        id: 10,
        role: "consumer",
        name: "María",
        surname: "Fernández",
        category_name: "Plomería",
      }),
    }),
  ]);

  await world.stubGet(
    "/work-orders?service_proposal_id=42",
    aWorkOrder({
      id: 10,
      service_proposal_id: 42,
      status: "scheduled",
      amount_cents: 1500000,
      scheduled_on: scheduledOn,
      description: "Reparación de cañería",
      accepted_on: "2026-08-05T10:00:00Z",
    })
  );

  await world.stubGet(
    "/work-orders/10",
    aWorkOrder({
      id: 10,
      service_proposal_id: 42,
      status: "scheduled",
      amount_cents: 1500000,
      scheduled_on: scheduledOn,
      description: "Reparación de cañería",
      accepted_on: "2026-08-05T10:00:00Z",
    })
  );

  await world.stubPost(
    "/files/presign",
    200,
    aPresignedUpload({
      file_id: "mock-completion-file-id",
      upload_url: "https://mock-upload.test/completion-upload",
      headers: {},
      key: "work_order_completion_image/mock-completion-file-id",
    })
  );

  await world.stubPost(
    "/files/presigned-url",
    200,
    aPresignedUpload({
      file_id: "mock-completion-file-id",
      upload_url: "https://mock-upload.test/completion-upload",
      headers: {},
      key: "work_order_completion_image/mock-completion-file-id",
    })
  );

  await world.page.route("https://mock-upload.test/completion-upload*", async (route) => {
    await route.fulfill({ status: 204 });
  });

  await world.stubPost(
    "/files/mock-completion-file-id/confirm",
    200,
    aConfirmedFile({
      id: "mock-completion-file-id",
      original_name: "evidencia.jpg",
    })
  );

  await world.stubPost(
    "/files/confirm",
    200,
    aConfirmedFile({
      id: "mock-completion-file-id",
      original_name: "evidencia.jpg",
    })
  );

  await world.stubPost("/work-orders/10/completion-reports", 201, aCompletionReportSubmission());
  await world.stubPost("/work-orders/42/completion-reports", 201, aCompletionReportSubmission());
}

async function selectAcceptedTab(world: CustomWorld) {
  const tabAceptadas = world.page.getByRole("tab", { name: /aceptadas/i });
  await tabAceptadas.waitFor({ state: "visible", timeout: 10000 });

  for (let i = 0; i < 10; i++) {
    await tabAceptadas.click();
    await world.page.waitForTimeout(200);
    const isSelected = await tabAceptadas.getAttribute("aria-selected");
    if (isSelected === "true") break;
    await world.page.waitForTimeout(300);
  }
}

async function openProposalDetail(world: CustomWorld) {
  await world.page.goto(APP_URL + ROUTES.provider.jobs, { waitUntil: "domcontentloaded" });
  await world.page.waitForLoadState("networkidle").catch(() => {});

  await selectAcceptedTab(world);

  const card = world.page.getByTestId("proposal-card").first();
  await card.waitFor({ state: "visible", timeout: 10000 });

  const detailModal = world.page.getByTestId("service-proposal-detail-modal");
  for (let i = 0; i < 5; i++) {
    await card.click();
    const isModalVisible = await detailModal.isVisible().catch(() => false);
    if (isModalVisible) break;
    await world.page.waitForTimeout(300);
  }
  await detailModal.waitFor({ state: "visible", timeout: 10000 });
}

async function openCompletionReportModal(world: CustomWorld) {
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await setupWorkOrderStubs(world, pastDate);
  await openProposalDetail(world);

  const reportBtn = world.page.getByRole("button", { name: "Informar finalización" });
  await reportBtn.waitFor({ state: "visible", timeout: 10000 });
  await reportBtn.click();

  const completionModal = world.page.getByTestId("report-work-completion-modal");
  await completionModal.waitFor({ state: "visible", timeout: 10000 });
}

Given(
  "que soy un prestador autenticado con una propuesta de servicio aceptada",
  async function (this: CustomWorld) {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await setupWorkOrderStubs(this, pastDate);
  }
);

Given(
  "que la orden de trabajo tiene fecha de servicio pasada",
  async function (this: CustomWorld) {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await setupWorkOrderStubs(this, pastDate);
  }
);

Given(
  "que la orden de trabajo tiene fecha de servicio futura",
  async function (this: CustomWorld) {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    await setupWorkOrderStubs(this, futureDate);
  }
);

Given(
  "abro el detalle de la propuesta aceptada",
  async function (this: CustomWorld) {
    await openProposalDetail(this);
  }
);

When(
  "visualizo las acciones disponibles",
  async function (this: CustomWorld) {
    const detailModal = this.page.getByTestId("service-proposal-detail-modal");
    await detailModal.waitFor({ state: "visible" });
  }
);

Then(
  "no veo el botón {string}",
  async function (this: CustomWorld, buttonName: string) {
    const btn = this.page.getByRole("button", { name: buttonName });
    const count = await btn.count();
    assert.strictEqual(count, 0, `Se visualiza el botón "${buttonName}" cuando no debería`);
  }
);

Then(
  "veo un aviso indicando que el servicio aún no fue realizado",
  async function (this: CustomWorld) {
    const banner = this.page.getByText(/el servicio aún no fue realizado|aún no llegó la fecha/i);
    await banner.waitFor({ state: "visible" });
    assert.ok(await banner.isVisible(), "No se muestra el aviso de fecha futura");
  }
);

When(
  "elijo informar la finalización del trabajo",
  async function (this: CustomWorld) {
    const reportBtn = this.page.getByRole("button", { name: "Informar finalización" });
    await reportBtn.waitFor({ state: "visible" });
    await reportBtn.click();
  }
);

Then(
  "veo los campos {string} y {string}",
  async function (this: CustomWorld, campo1: string, campo2: string) {
    const modal = this.page.getByTestId("report-work-completion-modal");
    const label1 = modal.locator("label").filter({ hasText: new RegExp(campo1, "i") }).first();
    const label2 = modal.locator("label").filter({ hasText: new RegExp(campo2, "i") }).first();

    await label1.waitFor({ state: "visible", timeout: 5000 });
    await label2.waitFor({ state: "visible", timeout: 5000 });

    assert.ok(await label1.isVisible(), `No se visualiza el campo "${campo1}"`);
    assert.ok(await label2.isVisible(), `No se visualiza el campo "${campo2}"`);
  }
);

Given(
  "que tengo abierto el formulario de reporte de finalización",
  async function (this: CustomWorld) {
    await openCompletionReportModal(this);
  }
);

Given(
  /^adjunto (\d+) foto(?:s)? de evidencia$/,
  async function (this: CustomWorld, countStr: string) {
    const count = parseInt(countStr, 10);
    const modal = this.page.getByTestId("report-work-completion-modal");

    for (let i = 1; i <= count; i++) {
      const fileId = `mock-completion-file-${i}`;
      await this.stubPost(
        "/files/presign",
        200,
        aPresignedUpload({
          file_id: fileId,
          upload_url: `https://mock-upload.test/completion-upload-${i}`,
          headers: {},
          key: `work_order_completion_image/${fileId}`,
        })
      );
      await this.stubPost(
        "/files/presigned-url",
        200,
        aPresignedUpload({
          file_id: fileId,
          upload_url: `https://mock-upload.test/completion-upload-${i}`,
          headers: {},
          key: `work_order_completion_image/${fileId}`,
        })
      );
      await this.page.route(`https://mock-upload.test/completion-upload-${i}`, async (route) => {
        await route.fulfill({ status: 204 });
      });
      await this.stubPost(
        `/files/${fileId}/confirm`,
        200,
        aConfirmedFile({
          id: fileId,
          original_name: `evidencia_${i}.jpg`,
        })
      );
      await this.stubPost(
        "/files/confirm",
        200,
        aConfirmedFile({
          id: fileId,
          original_name: `evidencia_${i}.jpg`,
        })
      );
    }

    const fileInput = modal.locator('input[type="file"]');
    const files = Array.from({ length: count }, (_, idx) => ({
      name: `evidencia_${idx + 1}.jpg`,
      mimeType: "image/jpeg",
      buffer: Buffer.from(`mock-image-data-${idx + 1}`),
    }));

    await fileInput.setInputFiles(files);
    await this.page.waitForTimeout(300);
  }
);

Given(
  "completo la descripción con {string}",
  async function (this: CustomWorld, description: string) {
    const modal = this.page.getByTestId("report-work-completion-modal");
    const textarea = modal.getByRole("textbox", { name: /descripción/i }).or(modal.locator("textarea"));
    await textarea.fill(description);
  }
);

When(
  "confirmo el reporte de finalización",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("report-work-completion-modal");
    const submitBtn = modal.getByRole("button", { name: /enviar reporte|confirmar|informar finalización/i });
    await submitBtn.waitFor({ state: "visible" });
    await submitBtn.click();
  }
);

Then(
  "veo un mensaje de éxito indicando que el reporte fue enviado",
  async function (this: CustomWorld) {
    const successMsg = this.page.getByText(/reporte de finalización enviado exitosamente|finalización informada|reporte enviado/i);
    await successMsg.waitFor({ state: "visible", timeout: 10000 });
    assert.ok(await successMsg.isVisible(), "No se muestra el mensaje de éxito");
  }
);

When(
  "visualizo el formulario vacío",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("report-work-completion-modal");
    await modal.waitFor({ state: "visible" });
  }
);

When(
  "visualizo el estado del formulario",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("report-work-completion-modal");
    await modal.waitFor({ state: "visible" });
  }
);

Then(
  "el botón de confirmar reporte permanece deshabilitado",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("report-work-completion-modal");
    const submitBtn = modal.getByRole("button", { name: /enviar reporte|confirmar|informar finalización/i });
    const isDisabled = await submitBtn.isDisabled();
    assert.ok(isDisabled, "El botón de confirmar reporte debería estar deshabilitado");
  }
);

Then(
  "el botón de confirmar reporte se habilita",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("report-work-completion-modal");
    const submitBtn = modal.getByRole("button", { name: /enviar reporte|confirmar|informar finalización/i });
    const isEnabled = await submitBtn.isEnabled();
    assert.ok(isEnabled, "El botón de confirmar reporte debería estar habilitado");
  }
);

Given(
  "la orden de trabajo ya tiene un reporte de finalización",
  async function (this: CustomWorld) {
    await this.stubPost(
      "/work-orders/10/completion-reports",
      409,
      anApiError("La orden de trabajo ya fue reportada previamente.")
    );
    await this.stubPost(
      "/work-orders/42/completion-reports",
      409,
      anApiError("La orden de trabajo ya fue reportada previamente.")
    );
  }
);

Then(
  "veo un mensaje de error indicando que la orden ya fue reportada",
  async function (this: CustomWorld) {
    const modal = this.page.getByTestId("report-work-completion-modal");
    const errorMsg = modal.getByText(/ya fue reportada|ya tiene un reporte/i);
    await errorMsg.waitFor({ state: "visible", timeout: 10000 });
    assert.ok(await errorMsg.isVisible(), "No se visualiza el error de orden ya reportada");
  }
);
