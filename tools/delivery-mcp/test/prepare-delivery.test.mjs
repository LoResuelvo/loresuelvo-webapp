import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { resolveReview, prepareDelivery } from "../lib/prepare-delivery.mjs";
import { MockCiProvider } from "../lib/ci-provider.mjs";

async function createTempGitRepo(t) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-prepare-test-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));

  execFileSync("git", ["init", "-b", "main"], { cwd: repoRoot });
  execFileSync("git", ["config", "user.name", "Tester"], { cwd: repoRoot });
  execFileSync("git", ["config", "user.email", "tester@example.com"], { cwd: repoRoot });
  execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: repoRoot });

  await fs.mkdir(path.join(repoRoot, ".delivery", "runtime", "records"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, ".delivery", "schemas"), { recursive: true });
  for (const schema of [
    "ci-inspection-result.schema.json",
    "delivery-context.schema.json",
    "execution-result.schema.json",
    "inspection-result.schema.json",
    "policy.schema.json",
  ]) {
    await fs.copyFile(
      path.join(".delivery", "schemas", schema),
      path.join(repoRoot, ".delivery", "schemas", schema)
    );
  }
  await fs.copyFile(
    path.join(".delivery", "policy.v1.json"),
    path.join(repoRoot, ".delivery", "policy.v1.json")
  );
  await fs.copyFile(".gitignore", path.join(repoRoot, ".gitignore"));

  await fs.writeFile(path.join(repoRoot, "README.md"), "# Initial\n", "utf8");
  execFileSync("git", ["add", "."], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "chore: initial commit"], { cwd: repoRoot });
  return repoRoot;
}

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

test("senales truncadas no pueden aprobarse parcialmente", () => {
  const result = resolveReview(
    {
      ...sampleInspection,
      maintainability: {
        ...sampleInspection.maintainability,
        signalCount: 21,
        truncated: true,
      },
    },
    {
      snapshotHash: "a".repeat(64),
      decisions: Object.fromEntries(
        sampleInspection.maintainability.signals.map((signal) => [
          signal.id,
          "This visible signal has been reviewed",
        ])
      ),
    }
  );

  assert.strictEqual(result.accepted, false);
  assert.strictEqual(result.status, "blocked");
  assert.strictEqual(result.diagnostic.code, "MAINTAINABILITY_SIGNAL_LIMIT_EXCEEDED");
});

test("prepareDelivery: reparar un commit verde (status: passed) es rechazado con REPAIR_TARGET_CI_PASSED", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const failedSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();

  await fs.writeFile(path.join(repoRoot, "fix.txt"), "fix content", "utf8");
  execFileSync("git", ["add", "fix.txt"], { cwd: repoRoot });

  const mockCi = new MockCiProvider({ [failedSha]: { status: "passed" } });
  const result = await prepareDelivery({
    repoRoot,
    intent: "repair_ci",
    repairsSha: failedSha,
    ciProvider: mockCi,
  });

  assert.strictEqual(result.status, "blocked");
  assert.ok(result.diagnostics.some((d) => d.code === "REPAIR_TARGET_CI_PASSED"));
});

test("prepareDelivery: CI provider_error bloquea la reparacion con CI_PROVIDER_ERROR", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const failedSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();

  await fs.writeFile(path.join(repoRoot, "fix.txt"), "fix content", "utf8");
  execFileSync("git", ["add", "fix.txt"], { cwd: repoRoot });

  const mockCi = new MockCiProvider({ [failedSha]: { status: "provider_error" } });
  const result = await prepareDelivery({
    repoRoot,
    intent: "repair_ci",
    repairsSha: failedSha,
    ciProvider: mockCi,
  });

  assert.strictEqual(result.status, "blocked");
  assert.ok(result.diagnostics.some((d) => d.code === "CI_PROVIDER_ERROR"));
});

test("prepareDelivery: commit fallido valido es aceptado para Gate R", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const failedSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();

  await fs.writeFile(path.join(repoRoot, "fix.txt"), "fix content", "utf8");
  execFileSync("git", ["add", "fix.txt"], { cwd: repoRoot });

  const mockCi = new MockCiProvider({ [failedSha]: { status: "failed" } });
  const executedChecks = [];
  const fakeExecute = async ({ check }) => {
    executedChecks.push(check.id);
    return {
      id: check.id,
      status: "passed",
      durationMs: 2,
      exitCode: 0,
      summaryLines: [],
      diagnostic: null,
    };
  };

  const result = await prepareDelivery({
    repoRoot,
    intent: "repair_ci",
    repairsSha: failedSha,
    ciProvider: mockCi,
    executeCheck: fakeExecute,
  });

  assert.strictEqual(result.status, "passed");
  assert.strictEqual(result.gate.id, "R");
  assert.deepStrictEqual(result.gate.checkIds, [
    "delivery_unit",
    "lint",
    "typecheck_app",
    "typecheck_cucumber",
    "unit",
    "e2e_full",
    "build",
  ]);
  assert.ok(executedChecks.includes("build"));
  assert.ok(executedChecks.includes("delivery_unit"));
});

test("prepareDelivery: modificacion de Dockerfile bloquea con HUMAN_ONLY_CHANGE", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  await fs.writeFile(path.join(repoRoot, "Dockerfile"), "FROM node:20\n", "utf8");
  execFileSync("git", ["add", "Dockerfile"], { cwd: repoRoot });

  const result = await prepareDelivery({
    repoRoot,
    intent: "prepare_commit",
  });

  assert.strictEqual(result.status, "blocked");
  assert.ok(result.diagnostics.some((d) => d.code === "HUMAN_ONLY_CHANGE"));
});

test("prepareDelivery: fallo de CI en job de Docker bloquea reparacion con HUMAN_ONLY_CI_FAILURE", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const failedSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();

  await fs.writeFile(path.join(repoRoot, "fix.txt"), "fix content", "utf8");
  execFileSync("git", ["add", "fix.txt"], { cwd: repoRoot });

  const mockCi = new MockCiProvider({
    [failedSha]: {
      status: "failed",
      failedJobs: ["build-docker-image"],
      failure: { message: "Docker build failed" },
    },
  });

  const result = await prepareDelivery({
    repoRoot,
    intent: "repair_ci",
    repairsSha: failedSha,
    ciProvider: mockCi,
  });

  assert.strictEqual(result.status, "blocked");
  assert.ok(result.diagnostics.some((d) => d.code === "HUMAN_ONLY_CI_FAILURE"));
});
