import test from "node:test";
import assert from "node:assert/strict";
import { resolveReview, buildRequiredAcknowledgement } from "../lib/prepare-delivery.mjs";
import { formatInspectionResult } from "../lib/format-result.mjs";
import { DeliveryPrepareInputSchema } from "../lib/input-schema.mjs";
import { server } from "../server.mjs";
import { validateExecutionResult, validateInspectionResult } from "../lib/validate-schema.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

const sampleSignals = [
  {
    id: "functionLines:domain/proposal/proposal.ts:1",
    rule: "functionLines",
    file: "domain/proposal/proposal.ts",
    line: 1,
    observed: 80,
    threshold: 60,
    message: "Function exceeds 60 lines",
  },
  {
    id: "useState:domain/proposal/proposal.ts:10",
    rule: "useState",
    file: "domain/proposal/proposal.ts",
    line: 10,
    observed: 6,
    threshold: 5,
    message: "useState exceeds 5",
  },
];

const sampleInspection = {
  schemaVersion: 1,
  status: "review_required",
  snapshotHash: "a".repeat(64),
  gate: { id: "A", reasonCodes: ["ISOLATED_PRODUCTION_CODE"], checkIds: ["unit"], postPushChecks: [] },
  maintainability: {
    status: "review_required",
    signalCount: 2,
    signals: sampleSignals,
  },
  diagnostics: [],
};

test("buildRequiredAcknowledgement: construye bloque estructurado con template y senales", () => {
  const reqAck = buildRequiredAcknowledgement({
    snapshotHash: "c".repeat(64),
    maintainability: { signals: sampleSignals },
  });

  assert.strictEqual(reqAck.snapshotHash, "c".repeat(64));
  assert.strictEqual(reqAck.signals.length, 2);
  assert.deepStrictEqual(reqAck.signals[0], {
    id: "functionLines:domain/proposal/proposal.ts:1",
    rule: "functionLines",
    file: "domain/proposal/proposal.ts",
    line: 1,
    message: "Function exceeds 60 lines",
  });
  assert.strictEqual(reqAck.template.snapshotHash, "c".repeat(64));
  assert.strictEqual(
    reqAck.template.decisions["functionLines:domain/proposal/proposal.ts:1"],
    "Justificación de al menos 12 caracteres"
  );
  assert.strictEqual(
    reqAck.template.decisions["useState:domain/proposal/proposal.ts:10"],
    "Justificación de al menos 12 caracteres"
  );
});

test("buildRequiredAcknowledgement: seguro ante senales vacias o undefined", () => {
  const reqAck = buildRequiredAcknowledgement({
    snapshotHash: "d".repeat(64),
    maintainability: null,
  });

  assert.strictEqual(reqAck.snapshotHash, "d".repeat(64));
  assert.deepStrictEqual(reqAck.signals, []);
  assert.deepStrictEqual(reqAck.template, {
    snapshotHash: "d".repeat(64),
    decisions: {},
  });
});

test("review_required: incluye requiredAcknowledgement con snapshotHash, signals y template", () => {
  const result = resolveReview(sampleInspection, null);

  assert.strictEqual(result.accepted, false);
  assert.strictEqual(result.status, "review_required");
  assert.strictEqual(result.diagnostic.code, "MAINTAINABILITY_ACK_REQUIRED");
  assert.ok(result.requiredAcknowledgement);
  assert.strictEqual(result.requiredAcknowledgement.snapshotHash, sampleInspection.snapshotHash);
  assert.strictEqual(result.requiredAcknowledgement.signals.length, 2);
  assert.strictEqual(
    result.requiredAcknowledgement.template.snapshotHash,
    sampleInspection.snapshotHash
  );
  assert.ok(
    result.requiredAcknowledgement.template.decisions["functionLines:domain/proposal/proposal.ts:1"]
  );
  assert.ok(
    result.requiredAcknowledgement.template.decisions["useState:domain/proposal/proposal.ts:10"]
  );
});

test("formatInspectionResult: incluye requiredAcknowledgement cuando status es review_required", () => {
  const formatted = formatInspectionResult({
    snapshot: {
      snapshotHash: "e".repeat(64),
      branch: "main",
      headSha: "1234567",
      usId: "US-12",
    },
    gateResult: {
      status: "review_required",
      gate: { id: "A", reasonCodes: [], checkIds: [], checks: [], parameters: {}, postPushChecks: [] },
      diagnostics: [],
    },
    maintainability: {
      status: "review_required",
      signals: sampleSignals,
    },
    policy: { version: 1, sourceHash: "hash" },
  });

  assert.strictEqual(formatted.status, "review_required");
  assert.ok(formatted.requiredAcknowledgement);
  assert.strictEqual(formatted.requiredAcknowledgement.snapshotHash, "e".repeat(64));
  assert.strictEqual(formatted.requiredAcknowledgement.signals.length, 2);
  assert.strictEqual(
    formatted.requiredAcknowledgement.template.decisions["functionLines:domain/proposal/proposal.ts:1"],
    "Justificación de al menos 12 caracteres"
  );
});

test("mapa de decisiones estándar aceptado por resolveReview y DeliveryPrepareInputSchema", () => {
  const payload = {
    intent: "prepare_commit",
    acknowledgement: {
      snapshotHash: "a".repeat(64),
      reason: "Global architectural justification",
      decisions: {
        "functionLines:domain/proposal/proposal.ts:1": "Function is cohesive despite 80 lines",
        "useState:domain/proposal/proposal.ts:10": "Local states are decoupled correctly",
      },
    },
  };

  const parsed = DeliveryPrepareInputSchema.safeParse(payload);
  assert.strictEqual(parsed.success, true);

  const reviewResult = resolveReview(sampleInspection, parsed.data.acknowledgement);
  assert.strictEqual(reviewResult.accepted, true);
  assert.strictEqual(reviewResult.review.status, "acknowledged");
  assert.strictEqual(reviewResult.review.snapshotHash, "a".repeat(64));
  assert.strictEqual(
    reviewResult.review.decisions["functionLines:domain/proposal/proposal.ts:1"],
    "Function is cohesive despite 80 lines"
  );
});

test("justificacion corta (< 12 caracteres) rechazada por Zod schema y por resolveReview", () => {
  const payload = {
    intent: "prepare_commit",
    acknowledgement: {
      snapshotHash: "a".repeat(64),
      decisions: {
        "functionLines:domain/proposal/proposal.ts:1": "Too short",
        "useState:domain/proposal/proposal.ts:10": "Valid length justification here",
      },
    },
  };

  const parsed = DeliveryPrepareInputSchema.safeParse(payload);
  assert.strictEqual(parsed.success, false);
  const issues = parsed.error.issues;
  assert.ok(issues.some((issue) => issue.path.includes("decisions")));

  const reviewResult = resolveReview(sampleInspection, payload.acknowledgement);
  assert.strictEqual(reviewResult.accepted, false);
  assert.strictEqual(reviewResult.status, "blocked");
  assert.strictEqual(reviewResult.diagnostic.code, "MAINTAINABILITY_DECISIONS_INCOMPLETE");
  assert.ok(reviewResult.diagnostic.message.includes("justification < 12 chars"));
});

test("snapshotHash diferente rechazado con MAINTAINABILITY_HASH_MISMATCH", () => {
  const reviewResult = resolveReview(sampleInspection, {
    snapshotHash: "f".repeat(64),
    decisions: {
      "functionLines:domain/proposal/proposal.ts:1": "Valid justification of length",
      "useState:domain/proposal/proposal.ts:10": "Another valid justification here",
    },
  });

  assert.strictEqual(reviewResult.accepted, false);
  assert.strictEqual(reviewResult.status, "blocked");
  assert.strictEqual(reviewResult.diagnostic.code, "MAINTAINABILITY_HASH_MISMATCH");
  assert.ok(reviewResult.diagnostic.message.includes("does not match current snapshot"));
});

test("señales faltantes rechazadas con detalle claro en el mensaje", () => {
  const reviewResult = resolveReview(sampleInspection, {
    snapshotHash: "a".repeat(64),
    decisions: {
      "functionLines:domain/proposal/proposal.ts:1": "Valid justification of length",
      // useState:domain/proposal/proposal.ts:10 is missing
    },
  });

  assert.strictEqual(reviewResult.accepted, false);
  assert.strictEqual(reviewResult.status, "blocked");
  assert.strictEqual(reviewResult.diagnostic.code, "MAINTAINABILITY_DECISIONS_INCOMPLETE");
  assert.ok(reviewResult.diagnostic.message.includes("missing: [useState:domain/proposal/proposal.ts:10]"));
});

test("compatibilidad hacia atrás con formato array en decisiones", () => {
  const payload = {
    intent: "prepare_commit",
    acknowledgement: {
      snapshotHash: "a".repeat(64),
      decisions: [
        {
          id: "functionLines:domain/proposal/proposal.ts:1",
          justification: "Legacy array justification >= 12 chars",
        },
        {
          id: "useState:domain/proposal/proposal.ts:10",
          justification: "Another legacy array justification",
        },
      ],
    },
  };

  const parsed = DeliveryPrepareInputSchema.safeParse(payload);
  assert.strictEqual(parsed.success, true);

  const reviewResult = resolveReview(sampleInspection, parsed.data.acknowledgement);
  assert.strictEqual(reviewResult.accepted, true);
  assert.strictEqual(reviewResult.review.status, "acknowledged");
  assert.strictEqual(
    reviewResult.review.decisions["functionLines:domain/proposal/proposal.ts:1"],
    "Legacy array justification >= 12 chars"
  );
});

test("manejo correcto de caracteres especiales en IDs (: / @ - .)", () => {
  const complexInspection = {
    ...sampleInspection,
    maintainability: {
      status: "review_required",
      signalCount: 1,
      signals: [
        {
          id: "@eslint/complexity:src/modules/sub-dir/file.service.ts:123",
          rule: "@eslint/complexity",
          file: "src/modules/sub-dir/file.service.ts",
          line: 123,
          observed: 15,
          threshold: 10,
          message: "High cyclomatic complexity",
        },
      ],
    },
  };

  const payload = {
    intent: "prepare_commit",
    acknowledgement: {
      snapshotHash: "a".repeat(64),
      decisions: {
        "@eslint/complexity:src/modules/sub-dir/file.service.ts:123": "Complexity justified due to dispatch table",
      },
    },
  };

  const parsed = DeliveryPrepareInputSchema.safeParse(payload);
  assert.strictEqual(parsed.success, true);

  const reviewResult = resolveReview(complexInspection, parsed.data.acknowledgement);
  assert.strictEqual(reviewResult.accepted, true);
  assert.strictEqual(reviewResult.review.status, "acknowledged");
  assert.strictEqual(
    reviewResult.review.decisions["@eslint/complexity:src/modules/sub-dir/file.service.ts:123"],
    "Complexity justified due to dispatch table"
  );
});

test("server.mjs publica schema canónico de acknowledgement y valida payload", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "ack-schema-test", version: "1.0.0" });

  try {
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const toolsResponse = await client.listTools();
    const prepareTool = toolsResponse.tools.find((t) => t.name === "delivery_prepare");
    assert.ok(prepareTool, "delivery_prepare tool must be listed");

    const ackSchema = prepareTool.inputSchema?.properties?.acknowledgement;
    assert.ok(ackSchema, "acknowledgement schema must be defined in delivery_prepare");
    assert.strictEqual(ackSchema.type, "object");
    assert.deepStrictEqual(ackSchema.required, ["snapshotHash"]);
    assert.strictEqual(ackSchema.properties.snapshotHash.type, "string");
    assert.strictEqual(ackSchema.properties.decisions.type, "object");
    assert.strictEqual(ackSchema.properties.decisions.additionalProperties.type, "string");
    assert.strictEqual(ackSchema.properties.decisions.additionalProperties.minLength, 12);

    // Call tool with invalid acknowledgement (justification < 12 chars in decisions)
    const badCall = await client.callTool({
      name: "delivery_prepare",
      arguments: {
        intent: "prepare_commit",
        acknowledgement: {
          snapshotHash: "a".repeat(64),
          decisions: {
            "signal-1": "short",
          },
        },
      },
    });
    assert.strictEqual(badCall.isError, true);
    const badResult = JSON.parse(badCall.content[0].text);
    assert.strictEqual(badResult.status, "blocked");
    assert.strictEqual(badResult.diagnostics[0].code, "INVALID_ARGUMENTS");
  } finally {
    await Promise.all([client.close(), server.close()]);
  }
});

test("schemas JSON de execution-result e inspection-result validan requiredAcknowledgement", () => {
  const executionRes = {
    schemaVersion: 1,
    status: "review_required",
    snapshotHash: "a".repeat(64),
    runKey: null,
    cached: false,
    policy: { version: 1, hash: "policy-hash" },
    gate: {
      id: "A",
      reasonCodes: ["ISOLATED_PRODUCTION_CODE"],
      checkIds: ["unit"],
      parameters: {},
      postPushChecks: [],
    },
    summary: { passed: 0, failed: 0, skipped: 1, durationMs: 0 },
    checks: [],
    diagnostics: [],
    evidence: { recordPath: null },
    requiredAcknowledgement: {
      snapshotHash: "a".repeat(64),
      signals: [
        {
          id: "rule1:file.ts:1",
          rule: "rule1",
          file: "file.ts",
          line: 1,
          message: "test message",
        },
      ],
      template: {
        snapshotHash: "a".repeat(64),
        decisions: {
          "rule1:file.ts:1": "Justificación de al menos 12 caracteres",
        },
      },
    },
  };

  const execValid = validateExecutionResult(executionRes);
  assert.strictEqual(execValid, true, "execution-result schema validation must return true");

  const inspectRes = {
    schemaVersion: 1,
    status: "review_required",
    snapshotHash: "a".repeat(64),
    repository: { branch: "main", headSha: "sha", usId: null },
    policy: { version: 1, hash: "hash" },
    gate: {
      id: "A",
      reasonCodes: [],
      checkIds: [],
      checks: [],
      parameters: {},
      postPushChecks: [],
    },
    impact: {
      gate: "A",
      reasonCodes: [],
      consumerCount: 0,
      affectedFeatures: 0,
      confidence: "high",
    },
    maintainability: {
      status: "review_required",
      filesReviewed: ["file.ts"],
      signalCount: 1,
      signals: [
        {
          id: "rule1:file.ts:1",
          rule: "rule1",
          file: "file.ts",
          line: 1,
          observed: 10,
          threshold: 5,
          message: "test message",
        },
      ],
      truncated: false,
    },
    diagnostics: [],
    requiredAcknowledgement: {
      snapshotHash: "a".repeat(64),
      signals: [
        {
          id: "rule1:file.ts:1",
          rule: "rule1",
          file: "file.ts",
          line: 1,
          message: "test message",
        },
      ],
      template: {
        snapshotHash: "a".repeat(64),
        decisions: {
          "rule1:file.ts:1": "Justificación de al menos 12 caracteres",
        },
      },
    },
  };

  const inspectValid = validateInspectionResult(inspectRes);
  assert.strictEqual(inspectValid, true, "inspection-result schema validation must return true");
});
