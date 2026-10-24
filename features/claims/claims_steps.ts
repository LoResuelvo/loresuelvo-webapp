import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { ROUTES } from "../../lib/routes";
import { aConfirmedFile, aJobRequest, aPresignedUpload, aProposal } from "../support/factories";
import { APP_URL, CustomWorld } from "../support/world";
import { aClaimPage, aClaimSummary } from "./claim-fixtures";

const JOB_REQUEST_ID = 47;
const SERVICE_PROPOSAL_ID = 42;
const CLAIM_ID = 321;
const OPERATION_ID = `jr-${JOB_REQUEST_ID}`;
const SERVICE_PROPOSAL_OPERATION_ID = `sp-${SERVICE_PROPOSAL_ID}`;
const SERVICE_PROPOSAL_REFERENCE = `service_proposal:${SERVICE_PROPOSAL_ID}`;
const TESTIMONY = "El servicio no se realizó y no pude resolver el problema con la contraparte.";
const EVIDENCE_FILE_ID = "550e8400-e29b-41d4-a716-446655440031";
const EVIDENCE_FILE_NAME = "evidencia.png";
const EVIDENCE_UPLOAD_URL = "https://mock-upload.test/claim-evidence-upload";
const PNG_1X1 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC";

async function openClaimsPage(
  world: CustomWorld,
  operation?: string,
  claimsPage = aClaimPage([], 1, 0),
) {
  await world.setSession("consumer");
  await world.stubGet("/job-requests", [
    aJobRequest({
      id: JOB_REQUEST_ID,
      title: "Reparación de cañería",
      description: "Pérdida de agua continua bajo bacha",
      status: "pending",
      consumer: { id: 10, name: "Ana", surname: "Pérez" },
      created_on: "2026-08-20T10:00:00Z",
    }),
  ]);
  await world.stubGet("/service-proposals", [
    aProposal("consumer", {
      id: SERVICE_PROPOSAL_ID,
      description: "Reparación de cañería en cocina",
      scheduled_on: "2026-08-20T10:00:00Z",
      status: "accepted",
    }),
  ]);
  await world.stubGet("/claims?page=1&limit=20", claimsPage);
  await world.stubPost("/claims", 201, {
    id: CLAIM_ID,
    operation_id: OPERATION_ID,
    reference: { job_request_id: JOB_REQUEST_ID },
    status: "open",
    created_on: "2026-10-19T12:00:00Z",
  });

  const query = operation ? `?operation=${encodeURIComponent(operation)}` : "";
  await world.page.goto(APP_URL + ROUTES.consumer.claims + query, { waitUntil: "domcontentloaded" });
}

async function openClaimsForm(world: CustomWorld) {
  await openClaimsPage(world);

  const history = world.page.getByRole("region", { name: "Historial de reclamos" });
  await history.waitFor({ state: "visible" });
  const startClaim = world.page.getByRole("button", { name: "Iniciar reclamo" });
  await startClaim.waitFor({ state: "visible" });
  assert.strictEqual(await world.page.getByTestId("claim-submit").isVisible(), false);
  await startClaim.click();
  await world.page.getByTestId("claim-submit").waitFor({ state: "visible" });
}

async function openContextualClaimsForm(world: CustomWorld) {
  await openClaimsPage(
    world,
    SERVICE_PROPOSAL_REFERENCE,
    aClaimPage([
      aClaimSummary({
        id: CLAIM_ID - 1,
        operation_id: SERVICE_PROPOSAL_OPERATION_ID,
        reference: { service_proposal_id: SERVICE_PROPOSAL_ID },
        status: "resolved",
        closed_on: "2026-10-18T12:00:00Z",
      }),
    ]),
  );
  const context = world.page.getByTestId("claim-reference-context");
  await context.waitFor({ state: "visible" });
  await world.page.getByTestId("claim-submit").waitFor({ state: "visible" });
  assert.strictEqual(await world.page.getByTestId("claim-reference").count(), 0);
  const summary = await context.innerText();
  assert.match(summary, /Reparación de cañería en cocina/i);
  assert.match(summary, /Juan Gómez/i);
  assert.match(summary, /20.*(?:ago|08).*2026/i);
  assert.match(summary, /Aceptad[ao]/i);
  await world.page.getByRole("button", { name: "Cambiar servicio" }).waitFor({ state: "visible" });
}

async function selectOwnOperation(world: CustomWorld) {
  const operation = world.page.getByTestId("claim-reference");
  await operation.waitFor({ state: "visible" });
  const option = operation.locator("option", { hasText: "Pérdida de agua continua bajo bacha" });
  await option.waitFor({ state: "attached" });
  await operation.selectOption({ label: (await option.innerText()).trim() });
  assert.strictEqual(await operation.inputValue(), `job_request:${JOB_REQUEST_ID}`);
}

async function assertRecognizableOperationOptions(world: CustomWorld) {
  const selector = world.page.getByTestId("claim-reference");
  const requestOption = selector.locator("option", { hasText: "Pérdida de agua continua bajo bacha" });
  const requestLabel = (await requestOption.innerText()).trim();
  assert.match(requestLabel, /Pérdida de agua continua bajo bacha/i);
  assert.match(requestLabel, /Ana Pérez/i);
  assert.ok(requestLabel.indexOf("Reparación de cañería") < requestLabel.indexOf("47"));

  const proposalOption = selector.locator("option", { hasText: "Reparación de cañería en cocina" });
  const proposalLabel = (await proposalOption.innerText()).trim();
  assert.match(proposalLabel, /Juan Gómez/i);
  assert.match(proposalLabel, /20.*(?:ago|08).*2026/i);
  assert.match(proposalLabel, /Aceptad[ao]/i);
  assert.ok(proposalLabel.indexOf("Reparación de cañería en cocina") < proposalLabel.indexOf("42"));
}

async function enterValidClaimDetails(world: CustomWorld) {
  const reason = world.page.getByTestId("claim-reason");
  await reason.waitFor({ state: "visible" });
  await reason.selectOption({ index: 1 });
  await world.page.getByTestId("claim-description").fill(TESTIMONY);
}

async function setUpEvidenceUpload(world: CustomWorld, status: "success" | "failure") {
  await world.stubPost(
    "/files/presign",
    200,
    aPresignedUpload({
      file_id: EVIDENCE_FILE_ID,
      key: `claim_evidence_image/${EVIDENCE_FILE_ID}`,
      upload_url: EVIDENCE_UPLOAD_URL,
      headers: { "Content-Type": "image/png", "If-None-Match": "*" },
    }),
  );

  if (status === "success") {
    await world.stubPost(
      `/files/${EVIDENCE_FILE_ID}/confirm`,
      200,
      aConfirmedFile({ id: EVIDENCE_FILE_ID, original_name: EVIDENCE_FILE_NAME }),
    );
  }

  await world.page.route(`${EVIDENCE_UPLOAD_URL}*`, async (route) => {
    const headers = route.request().headers();
    assert.strictEqual(headers["content-type"], "image/png");
    assert.strictEqual(headers["if-none-match"], "*");
    await route.fulfill({
      status: status === "success" ? 204 : 500,
      ...(status === "failure" ? { body: "Upload failed" } : {}),
    });
  });
}

async function selectEvidenceImage(world: CustomWorld) {
  await world.page.getByTestId("claim-evidence").setInputFiles({
    name: EVIDENCE_FILE_NAME,
    mimeType: "image/png",
    buffer: Buffer.from(PNG_1X1, "base64"),
  });
}

Given(
  "un consumidor o prestador autenticado con una solicitud pendiente, propuesta u orden propia accesible",
  async function (this: CustomWorld) {
    await openClaimsForm(this);
  },
);

When(
  "presenta un reclamo con un motivo y testimonio válidos",
  async function (this: CustomWorld) {
    await assertRecognizableOperationOptions(this);
    await selectOwnOperation(this);
    await enterValidClaimDetails(this);
    await this.page.getByTestId("claim-submit").click();
  },
);

Then(
  "recibe una confirmación con el identificador del reclamo y su estado Abierto, vinculado a la operación correspondiente.",
  async function (this: CustomWorld) {
    const confirmation = this.page.getByTestId("claim-confirmation");
    await confirmation.waitFor({ state: "visible" });
    const text = await confirmation.innerText();
    assert.ok(text.includes(`Reclamo #${CLAIM_ID} creado`));
    assert.ok(text.includes("Estado: Abierto"));
    assert.ok(text.includes(`Operación: ${OPERATION_ID}`));
  },
);

Given(
  "un participante que está preparando un reclamo y seleccionó hasta tres imágenes JPEG o PNG válidas de hasta 5 MiB cada una",
  async function (this: CustomWorld) {
    await openClaimsForm(this);
    await setUpEvidenceUpload(this, "success");
    await selectOwnOperation(this);
    await selectEvidenceImage(this);
  },
);

When(
  "presenta el reclamo con esas imágenes",
  async function (this: CustomWorld) {
    await enterValidClaimDetails(this);
    await this.page.getByTestId("claim-submit").click();
  },
);

Then(
  "recibe la confirmación del reclamo con su evidencia vinculada de forma privada.",
  async function (this: CustomWorld) {
    const confirmation = this.page.getByTestId("claim-confirmation");
    await confirmation.waitFor({ state: "visible" });
    const text = await confirmation.innerText();
    assert.ok(text.includes(`Reclamo #${CLAIM_ID} creado`));
    assert.ok(text.includes("Evidencia vinculada: 1 imagen"));
  },
);

Given(
  "un participante que prepara un reclamo con datos incompletos o inválidos, imágenes no admitidas o evidencia cuya carga falló",
  async function (this: CustomWorld) {
    await openClaimsForm(this);
    await setUpEvidenceUpload(this, "failure");
    await selectOwnOperation(this);
    await enterValidClaimDetails(this);
    await selectEvidenceImage(this);

    await this.page
      .getByTestId("claim-upload-error")
      .waitFor({ state: "visible" });
  },
);

When(
  "intenta presentar el reclamo",
  async function (this: CustomWorld) {
    await this.page.getByTestId("claim-submit").click();
  },
);

Then(
  "recibe indicaciones comprensibles para corregir los datos, reintentar la carga o quitar imágenes, conserva lo ingresado y no se confirma un reclamo incompleto.",
  async function (this: CustomWorld) {
    const uploadError = this.page.getByTestId("claim-upload-error");
    await uploadError.waitFor({ state: "visible" });
    assert.match(await uploadError.innerText(), /reintentar|reintento/i);
    assert.match(await uploadError.innerText(), /quitá la imagen/i);

    const removeImage = this.page.getByTestId("claim-evidence-remove-0");
    await removeImage.waitFor({ state: "visible" });
    await this.page.getByTestId("claim-description").waitFor({ state: "visible" });
    assert.strictEqual(await this.page.getByTestId("claim-description").inputValue(), TESTIMONY);
    assert.strictEqual(await this.page.getByTestId("claim-confirmation").count(), 0);
  },
);

Given(
  "un participante cuyo reclamo quedó sin confirmación por un problema de conexión",
  async function (this: CustomWorld) {
    await openClaimsForm(this);
    await this.stubPost("/claims", 504, { error: "Connection lost" });
    await selectOwnOperation(this);
    await enterValidClaimDetails(this);
    await this.page.getByTestId("claim-submit").click();
    const error = this.page.locator("#claim-form-error");
    await error.waitFor({ state: "visible" });
    assert.match(await error.innerText(), /no pudimos enviar el reclamo/i);

    await this.stubPost("/claims", 200, {
      id: CLAIM_ID,
      operation_id: OPERATION_ID,
      reference: { job_request_id: JOB_REQUEST_ID },
      status: "in_review",
      created_on: "2026-10-19T12:00:00Z",
    });
  },
);

When(
  "reintenta la misma presentación",
  async function (this: CustomWorld) {
    await this.page.getByTestId("claim-submit").click();
  },
);

Then(
  "obtiene la confirmación del expediente y su estado actual sin crear un reclamo duplicado.",
  async function (this: CustomWorld) {
    const confirmation = this.page.getByTestId("claim-confirmation");
    await confirmation.waitFor({ state: "visible" });
    const text = await confirmation.innerText();
    assert.ok(text.includes(`Reclamo #${CLAIM_ID} creado`));
    assert.ok(text.includes("Estado: En revisión"));
    assert.ok(text.includes(`Operación: ${OPERATION_ID}`));
  },
);

Given(
  "un participante con un reclamo propio abierto o en revisión sobre una operación",
  async function (this: CustomWorld) {
    await openClaimsForm(this);
    await this.stubPost("/claims", 409, {
      error: "an unfinished claim already exists for this operation",
    });
    await selectOwnOperation(this);
    await enterValidClaimDetails(this);
  },
);

When(
  "intenta presentar otro reclamo sobre esa misma operación",
  async function (this: CustomWorld) {
    await this.page.getByTestId("claim-submit").click();
  },
);

Then(
  "recibe un aviso de que ya tiene un reclamo en curso y el expediente anterior se conserva sin cambios.",
  async function (this: CustomWorld) {
    const error = this.page.locator("#claim-form-error");
    await error.waitFor({ state: "visible" });
    assert.ok((await error.innerText()).includes("Ya tenés un reclamo en curso"));
    assert.strictEqual(await this.page.getByTestId("claim-reference").inputValue(), `job_request:${JOB_REQUEST_ID}`);
    assert.strictEqual(await this.page.getByTestId("claim-description").inputValue(), TESTIMONY);
    assert.strictEqual(await this.page.getByTestId("claim-confirmation").count(), 0);
  },
);

Given(
  "un participante cuya contraparte tiene un reclamo en la operación o cuyo reclamo propio anterior ya fue resuelto o desestimado",
  async function (this: CustomWorld) {
    await openContextualClaimsForm(this);
    await this.stubPost("/claims", 201, {
      id: CLAIM_ID + 1,
      operation_id: SERVICE_PROPOSAL_OPERATION_ID,
      reference: { service_proposal_id: SERVICE_PROPOSAL_ID },
      status: "open",
      created_on: "2026-10-19T12:05:00Z",
    });
  },
);

When(
  "presenta un nuevo reclamo válido sobre la operación",
  async function (this: CustomWorld) {
    await this.page.getByRole("button", { name: "Cambiar servicio" }).click();
    const reference = this.page.getByTestId("claim-reference");
    await reference.waitFor({ state: "visible" });
    await this.page.waitForFunction(() => document.activeElement?.id === "claim-reference");
    assert.strictEqual(await reference.inputValue(), SERVICE_PROPOSAL_REFERENCE);

    await enterValidClaimDetails(this);

    await this.page.getByRole("button", { name: "Cerrar formulario" }).click();
    await this.page.getByTestId("claim-submit").waitFor({ state: "hidden" });
    await this.page.getByRole("button", { name: "Iniciar reclamo" }).click();
    await this.page.getByTestId("claim-submit").waitFor({ state: "visible" });
    await this.page.waitForFunction(() => document.activeElement?.id === "claim-form-heading");

    assert.strictEqual(await reference.inputValue(), SERVICE_PROPOSAL_REFERENCE);
    assert.strictEqual(await this.page.getByTestId("claim-reason").inputValue(), "non_compliance");
    assert.strictEqual(await this.page.getByTestId("claim-description").inputValue(), TESTIMONY);
    await this.page.getByTestId("claim-submit").click();
  },
);

Then(
  "obtiene un expediente propio nuevo sin modificar los anteriores ni acceder al expediente de la contraparte.",
  async function (this: CustomWorld) {
    const confirmation = this.page.getByTestId("claim-confirmation");
    await confirmation.waitFor({ state: "visible" });
    const text = await confirmation.innerText();
    assert.ok(text.includes(`Reclamo #${CLAIM_ID + 1} creado`));
    assert.ok(text.includes("Estado: Abierto"));
    assert.ok(text.includes(`Operación: ${SERVICE_PROPOSAL_OPERATION_ID}`));
    assert.ok(text.includes("Reparación de cañería en cocina"));
    assert.ok(text.includes(`Referencia #${SERVICE_PROPOSAL_ID}`));
    assert.strictEqual(await confirmation.getByRole("button", { name: "Cambiar servicio" }).count(), 0);
    assert.ok(!text.includes(`#${CLAIM_ID}`));

    const previousClaim = this.page
      .getByRole("article")
      .filter({ has: this.page.getByRole("heading", { name: `Reclamo #${CLAIM_ID - 1}`, exact: true }) });
    await previousClaim.waitFor({ state: "visible" });
    assert.match(await previousClaim.innerText(), /Estado: Resuelto/);
  },
);
