import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import { ROUTES } from "../../lib/routes";
import { aConfirmedFile, aJobRequest, aPresignedUpload } from "../support/factories";
import { APP_URL, CustomWorld } from "../support/world";

const JOB_REQUEST_ID = 47;
const CLAIM_ID = 321;
const OPERATION_ID = `jr-${JOB_REQUEST_ID}`;
const TESTIMONY = "El servicio no se realizó y no pude resolver el problema con la contraparte.";
const EVIDENCE_FILE_ID = "550e8400-e29b-41d4-a716-446655440031";
const EVIDENCE_FILE_NAME = "evidencia.png";
const EVIDENCE_UPLOAD_URL = "https://mock-upload.test/claim-evidence-upload";
const PNG_1X1 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC";

async function openClaimsForm(world: CustomWorld) {
  await world.setSession("consumer");
  await world.stubGet("/job-requests", [
    aJobRequest({
      id: JOB_REQUEST_ID,
      title: "Reparación de cañería",
      description: "Pérdida de agua continua bajo bacha",
      status: "pending",
      consumer: { id: 10, name: "Ana", surname: "Pérez" },
    }),
  ]);
  await world.stubGet("/service-proposals", []);
  await world.stubGet("/claims", { items: [], page: 1, limit: 20, total: 0 });
  await world.stubPost("/claims", 201, {
    id: CLAIM_ID,
    operation_id: OPERATION_ID,
    reference: { job_request_id: JOB_REQUEST_ID },
    status: "open",
    created_on: "2026-10-19T12:00:00Z",
  });

  await world.page.goto(APP_URL + ROUTES.consumer.claims, { waitUntil: "domcontentloaded" });
  await world.page.getByTestId("claim-submit").waitFor({ state: "visible" });
}

async function selectOwnOperation(world: CustomWorld) {
  const operation = world.page.getByTestId("claim-reference");
  await operation.waitFor({ state: "visible" });
  await operation.selectOption({ value: `job_request:${JOB_REQUEST_ID}` });
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
