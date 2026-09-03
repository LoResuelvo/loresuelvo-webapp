import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  saveDeliveryContext,
  loadDeliveryContext,
  clearDeliveryContext,
  consumeDeliveryContext,
  validateDeliveryContext,
  inferWipRemovalScenario,
} from "../lib/delivery-context.mjs";
import { inspectDelivery } from "../lib/inspect-delivery.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { server } from "../server.mjs";

test("saveDeliveryContext y loadDeliveryContext: guarda y lee contexto ligado a HEAD/snapshot", async (t) => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-ctx-test-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));

  await fs.mkdir(path.join(repoRoot, ".delivery", "schemas"), { recursive: true });
  await fs.copyFile(
    ".delivery/schemas/delivery-context.schema.json",
    path.join(repoRoot, ".delivery", "schemas", "delivery-context.schema.json")
  );

  const snapshot = {
    branch: "feature/search",
    headSha: "a".repeat(40),
    snapshotHash: "b".repeat(64),
  };

  const saved = await saveDeliveryContext({
    repoRoot,
    snapshot,
    intent: "close_scenario",
    usId: "US-01",
    featureFile: "features/provider/search.feature",
    scenarioName: "Provider search by category",
    scopeFiles: ["features/provider/search.feature"],
  });

  assert.strictEqual(saved.schemaVersion, 1);
  assert.strictEqual(saved.branch, "feature/search");
  assert.strictEqual(saved.headSha, "a".repeat(40));
  assert.strictEqual(saved.snapshotHash, "b".repeat(64));
  assert.strictEqual(saved.intent, "close_scenario");
  assert.strictEqual(saved.usId, "US-01");
  assert.strictEqual(saved.consumed, false);

  const loaded = await loadDeliveryContext({ repoRoot });
  assert.deepStrictEqual(loaded, saved);

  const validation = validateDeliveryContext({ context: loaded, snapshot });
  assert.strictEqual(validation.valid, true);
});

test("validateDeliveryContext: contexto expira si snapshot o HEAD no coincide", async (t) => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-ctx-test-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));

  await fs.mkdir(path.join(repoRoot, ".delivery", "schemas"), { recursive: true });
  await fs.copyFile(
    ".delivery/schemas/delivery-context.schema.json",
    path.join(repoRoot, ".delivery", "schemas", "delivery-context.schema.json")
  );

  const snapshot = {
    branch: "main",
    headSha: "1".repeat(40),
    snapshotHash: "2".repeat(64),
  };

  const context = await saveDeliveryContext({
    repoRoot,
    snapshot,
    intent: "close_batch",
    scopeFiles: ["features/a.feature"],
  });

  // 1. Snapshot modified
  const modifiedSnapshot = { ...snapshot, snapshotHash: "3".repeat(64) };
  const valSnap = validateDeliveryContext({ context, snapshot: modifiedSnapshot });
  assert.strictEqual(valSnap.valid, false);
  assert.strictEqual(valSnap.expired, true);
  assert.strictEqual(valSnap.reason, "CONTEXT_SNAPSHOT_MISMATCH");

  // 2. HEAD modified (new commit)
  const modifiedHead = { ...snapshot, headSha: "4".repeat(40) };
  const valHead = validateDeliveryContext({ context, snapshot: modifiedHead });
  assert.strictEqual(valHead.valid, false);
  assert.strictEqual(valHead.expired, true);
  assert.strictEqual(valHead.reason, "CONTEXT_HEAD_MISMATCH");

  // 3. Consumed context
  const consumed = await consumeDeliveryContext({ repoRoot, context });
  assert.strictEqual(consumed.consumed, true);
  const valConsumed = validateDeliveryContext({ context: consumed, snapshot });
  assert.strictEqual(valConsumed.valid, false);
  assert.strictEqual(valConsumed.expired, true);
  assert.strictEqual(valConsumed.reason, "CONTEXT_ALREADY_CONSUMED");
});

test("clearDeliveryContext: elimina el contexto activo", async (t) => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-ctx-test-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));

  await fs.mkdir(path.join(repoRoot, ".delivery", "schemas"), { recursive: true });
  await fs.copyFile(
    ".delivery/schemas/delivery-context.schema.json",
    path.join(repoRoot, ".delivery", "schemas", "delivery-context.schema.json")
  );

  await saveDeliveryContext({
    repoRoot,
    snapshot: { branch: "main", headSha: "a".repeat(40), snapshotHash: "b".repeat(64) },
    intent: "close_scenario",
  });

  assert.ok(await loadDeliveryContext({ repoRoot }));
  const res = await clearDeliveryContext({ repoRoot });
  assert.strictEqual(res.cleared, true);
  assert.strictEqual(await loadDeliveryContext({ repoRoot }), null);
});

test("detecta conflicto entre US del mensaje y contexto activo", async () => {
  const snapshot = {
    branch: "main",
    headSha: "a".repeat(40),
    snapshotHash: "b".repeat(64),
  };

  const context = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    branch: "main",
    headSha: "a".repeat(40),
    snapshotHash: "b".repeat(64),
    intent: "close_scenario",
    usId: "US-01",
    featureFile: "features/a.feature",
    scenarioName: "Test",
    scopeFiles: [],
    consumed: false,
    consumedAt: null,
  };

  // 1. Conflicting US in message
  const conflict = validateDeliveryContext({
    context,
    snapshot,
    proposedCommitMessage: "feat[30.2]: implement new card",
  });
  assert.strictEqual(conflict.valid, false);
  assert.strictEqual(conflict.conflict, true);
  assert.strictEqual(conflict.reason, "CONTEXT_US_CONFLICT");

  // 2. Matching US in message (e.g. US-01 or 01)
  const matching = validateDeliveryContext({
    context,
    snapshot,
    proposedCommitMessage: "feat[US-01]: implement new card",
  });
  assert.strictEqual(matching.valid, true);
});

test("safe inference: retiro de @wip en diff staged de un unico escenario sugiere close_scenario", () => {
  const diffWithWipRemoval = [
    "diff --git a/features/provider/reviews.feature b/features/provider/reviews.feature",
    "--- a/features/provider/reviews.feature",
    "+++ b/features/provider/reviews.feature",
    "@@ -10,3 +10,2 @@",
    "-  @wip",
    "   Scenario: Provider reviews list",
  ].join("\n");

  const stagedFiles = ["features/provider/reviews.feature"];
  const inferred = inferWipRemovalScenario(diffWithWipRemoval, stagedFiles);

  assert.ok(inferred, "inferred result present");
  assert.strictEqual(inferred.intent, "close_scenario");
  assert.strictEqual(inferred.featureFile, "features/provider/reviews.feature");

  // Multi-feature or adding @wip does not infer
  const diffAdded = diffWithWipRemoval + "\n+  @wip";
  assert.strictEqual(inferWipRemovalScenario(diffAdded, stagedFiles), null);

  const multiFiles = ["features/a.feature", "features/b.feature"];
  assert.strictEqual(inferWipRemovalScenario(diffWithWipRemoval, multiFiles), null);
});

test("paridad CLI / MCP para contexto activo en inspectDelivery", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "ctx-parity-test", version: "1.0.0" });

  try {
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    // Clear any active context first
    await clearDeliveryContext();

    // 1. Inspect without context
    const cliNoCtx = (await inspectDelivery({ intent: "prepare_commit" })).result;
    const mcpNoCtxCall = await client.callTool({
      name: "delivery_inspect",
      arguments: { intent: "prepare_commit" },
    });
    const mcpNoCtx = JSON.parse(mcpNoCtxCall.content[0].text);
    assert.strictEqual(cliNoCtx.status, mcpNoCtx.status);
    assert.strictEqual(cliNoCtx.gate.id, mcpNoCtx.gate.id);
  } finally {
    await client.close();
    await clearDeliveryContext();
  }
});
