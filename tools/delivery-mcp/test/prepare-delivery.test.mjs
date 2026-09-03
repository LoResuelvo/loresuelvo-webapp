import test from "node:test";
import assert from "node:assert/strict";
import { resolveReview } from "../lib/prepare-delivery.mjs";

const sampleInspection = {
  schemaVersion: 1,
  status: "review_required",
  snapshotHash: "a".repeat(64),
  gate: { id: "A", reasonCodes: ["ISOLATED_PRODUCTION_CODE"], checkIds: ["unit"], postPushChecks: [] },
  maintainability: {
    status: "review_required",
    signalCount: 2,
    signals: [
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
    ],
  },
  diagnostics: [],
};

test("decisiones de mantenibilidad incompletas bloquean: falta acknowledgement", () => {
  const result = resolveReview(sampleInspection, null);
  assert.strictEqual(result.accepted, false);
  assert.strictEqual(result.status, "review_required");
  assert.strictEqual(result.diagnostic.code, "MAINTAINABILITY_ACK_REQUIRED");
});

test("decisiones de mantenibilidad incompletas bloquean: snapshotHash diferente", () => {
  const result = resolveReview(sampleInspection, {
    snapshotHash: "b".repeat(64),
    decisions: {
      "functionLines:domain/proposal/proposal.ts:1": "Justification of sufficient length here",
      "useState:domain/proposal/proposal.ts:10": "Another valid justification of length",
    },
  });
  assert.strictEqual(result.accepted, false);
  assert.strictEqual(result.status, "blocked");
  assert.strictEqual(result.diagnostic.code, "MAINTAINABILITY_HASH_MISMATCH");
});

test("decisiones de mantenibilidad incompletas bloquean: bypass generico rechazado", () => {
  const result = resolveReview(sampleInspection, {
    snapshotHash: "a".repeat(64),
    reason: "A generic bypass of all signals without per-signal coverage",
  });
  assert.strictEqual(result.accepted, false);
  assert.strictEqual(result.status, "blocked");
  assert.strictEqual(result.diagnostic.code, "MAINTAINABILITY_DECISIONS_INCOMPLETE");
});

test("decisiones de mantenibilidad incompletas bloquean: decision faltante para una de las senales", () => {
  const result = resolveReview(sampleInspection, {
    snapshotHash: "a".repeat(64),
    decisions: {
      "functionLines:domain/proposal/proposal.ts:1": "Justification of sufficient length here",
      // useState is missing!
    },
  });
  assert.strictEqual(result.accepted, false);
  assert.strictEqual(result.status, "blocked");
  assert.strictEqual(result.diagnostic.code, "MAINTAINABILITY_DECISIONS_INCOMPLETE");
  assert.ok(result.diagnostic.message.includes("missing: [useState:domain/proposal/proposal.ts:10]"));
});

test("decisiones de mantenibilidad incompletas bloquean: justificacion demasiado corta (< 12 caracteres)", () => {
  const result = resolveReview(sampleInspection, {
    snapshotHash: "a".repeat(64),
    decisions: {
      "functionLines:domain/proposal/proposal.ts:1": "Too short", // < 12 chars
      "useState:domain/proposal/proposal.ts:10": "Valid length justification here",
    },
  });
  assert.strictEqual(result.accepted, false);
  assert.strictEqual(result.status, "blocked");
  assert.strictEqual(result.diagnostic.code, "MAINTAINABILITY_DECISIONS_INCOMPLETE");
  assert.ok(result.diagnostic.message.includes("justification < 12 chars"));
});

test("decisiones de mantenibilidad completas: todas las senales cubiertas con justificacion >= 12 caracteres son aceptadas", () => {
  const result = resolveReview(sampleInspection, {
    snapshotHash: "a".repeat(64),
    decisions: {
      "functionLines:domain/proposal/proposal.ts:1": "Function is cohesive despite 80 lines",
      "useState:domain/proposal/proposal.ts:10": "Local states are decoupled correctly",
    },
  });
  assert.strictEqual(result.accepted, true);
  assert.strictEqual(result.review.status, "acknowledged");
  assert.strictEqual(result.review.snapshotHash, "a".repeat(64));
  assert.ok(result.review.decisions["functionLines:domain/proposal/proposal.ts:1"]);
  assert.ok(result.review.decisions["useState:domain/proposal/proposal.ts:10"]);
});
