import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { server } from "../server.mjs";
import { inspectDelivery } from "../lib/inspect-delivery.mjs";
import { prepareDelivery } from "../lib/prepare-delivery.mjs";
import { finalizeDelivery, verifyHeadDelivery } from "../lib/delivery-finalize.mjs";
import { testDelivery } from "../lib/test-delivery.mjs";
import {
  DeliveryInspectInputSchema,
  DeliveryPrepareInputSchema,
  DeliveryFinalizeInputSchema,
  DeliveryVerifyHeadInputSchema,
  DeliveryTestInputSchema,
} from "../lib/input-schema.mjs";

async function initializeParityRepo(repoRoot, sourceRoot) {
  await fs.mkdir(path.join(repoRoot, ".delivery"), { recursive: true });
  await fs.cp(path.join(sourceRoot, ".delivery", "schemas"), path.join(repoRoot, ".delivery", "schemas"),
    { recursive: true });
  await fs.copyFile(path.join(sourceRoot, ".delivery", "policy.v1.json"),
    path.join(repoRoot, ".delivery", "policy.v1.json"));
  await fs.copyFile(path.join(sourceRoot, ".gitignore"), path.join(repoRoot, ".gitignore"));
  await fs.writeFile(path.join(repoRoot, "README.md"), "# Adapter parity fixture\n");
  const git = (...args) => execFileSync("git", args, { cwd: repoRoot, stdio: "ignore" });
  git("init", "-b", "main");
  git("config", "user.name", "Tester");
  git("config", "user.email", "tester@example.com");
  git("config", "commit.gpgsign", "false");
  git("add", ".");
  git("commit", "-m", "chore: initialize parity fixture");
}

test("paridad CLI / MCP: inspect, prepare, finalize y verify_head producen el mismo resultado semantico", async () => {
  const originalCwd = process.cwd();
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-parity-"));
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "parity-test", version: "1.0.0" });

  try {
    await initializeParityRepo(fixtureRoot, originalCwd);
    process.chdir(fixtureRoot);
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    // 1. Inspect parity test
    const inspectInput = {
      intent: "prepare_commit",
      proposedCommitMessage: "feat[54]: new search feature",
    };
    const parsedInspect = DeliveryInspectInputSchema.parse(inspectInput);

    // Direct / CLI equivalent
    const cliResult = (await inspectDelivery(parsedInspect)).result;

    // MCP equivalent
    const mcpCall = await client.callTool({
      name: "delivery_inspect",
      arguments: inspectInput,
    });
    const mcpResult = JSON.parse(mcpCall.content[0].text);

    assert.strictEqual(mcpResult.status, cliResult.status);
    assert.strictEqual(mcpResult.snapshotHash, cliResult.snapshotHash);
    assert.strictEqual(mcpResult.gate.id, cliResult.gate.id);
    assert.deepStrictEqual(mcpResult.gate.checkIds, cliResult.gate.checkIds);
    assert.deepStrictEqual(mcpResult.diagnostics, cliResult.diagnostics);

    // 2. Prepare parity test (empty diff / no_changes)
    if (cliResult.status === "no_changes") {
      const prepareInput = {
        intent: "prepare_commit",
      };
      const parsedPrepare = DeliveryPrepareInputSchema.parse(prepareInput);

      const cliPrepareResult = await prepareDelivery(parsedPrepare);
      const mcpPrepareCall = await client.callTool({
        name: "delivery_prepare",
        arguments: prepareInput,
      });
      const mcpPrepareResult = JSON.parse(mcpPrepareCall.content[0].text);

      assert.strictEqual(mcpPrepareResult.status, cliPrepareResult.status);
      assert.strictEqual(mcpPrepareResult.snapshotHash, cliPrepareResult.snapshotHash);
      assert.strictEqual(mcpPrepareResult.gate.id, cliPrepareResult.gate.id);
      assert.deepStrictEqual(mcpPrepareResult.gate.checkIds, cliPrepareResult.gate.checkIds);
      assert.deepStrictEqual(mcpPrepareResult.summary, cliPrepareResult.summary);
    }

    // The fixture has no delivery evidence or feature scope: adapter parity
    // stays independent of remote CI and never launches real gates.
    const finalizeInput = {
      intent: "close_us",
    };
    const parsedFinalize = DeliveryFinalizeInputSchema.parse(finalizeInput);
    const cliFinalizeResult = await finalizeDelivery(parsedFinalize);
    const mcpFinalizeCall = await client.callTool({
      name: "delivery_finalize",
      arguments: finalizeInput,
    });
    const mcpFinalizeResult = JSON.parse(mcpFinalizeCall.content[0].text);

    assert.strictEqual(mcpFinalizeResult.finalized, cliFinalizeResult.finalized);
    assert.strictEqual(mcpFinalizeResult.status, cliFinalizeResult.status);
    assert.strictEqual(mcpFinalizeResult.reason, cliFinalizeResult.reason);

    // 3.1 Finalize with waitForCi parity test
    const finalizeWaitInput = {
      intent: "close_us",
      waitForCi: true,
      timeoutMs: 500,
      pollIntervalMs: 100,
    };
    const parsedFinalizeWait = DeliveryFinalizeInputSchema.parse(finalizeWaitInput);
    const cliFinalizeWaitResult = await finalizeDelivery(parsedFinalizeWait);
    const mcpFinalizeWaitCall = await client.callTool({
      name: "delivery_finalize",
      arguments: finalizeWaitInput,
    });
    const mcpFinalizeWaitResult = JSON.parse(mcpFinalizeWaitCall.content[0].text);

    assert.strictEqual(mcpFinalizeWaitResult.finalized, cliFinalizeWaitResult.finalized);
    assert.strictEqual(mcpFinalizeWaitResult.status, cliFinalizeWaitResult.status);
    assert.strictEqual(mcpFinalizeWaitResult.reason, cliFinalizeWaitResult.reason);

    // 4. Verify-head parity test
    const verifyHeadInput = {
      intent: "close_us",
      force: true,
    };
    const parsedVerifyHead = DeliveryVerifyHeadInputSchema.parse(verifyHeadInput);
    const cliVerifyHeadResult = await verifyHeadDelivery(parsedVerifyHead);
    const mcpVerifyHeadCall = await client.callTool({
      name: "delivery_verify_head",
      arguments: verifyHeadInput,
    });
    const mcpVerifyHeadResult = JSON.parse(mcpVerifyHeadCall.content[0].text);

    assert.strictEqual(mcpVerifyHeadResult.verified, cliVerifyHeadResult.verified);
    assert.strictEqual(mcpVerifyHeadResult.status, cliVerifyHeadResult.status);
    assert.strictEqual(mcpVerifyHeadResult.reason, cliVerifyHeadResult.reason);

    // 5. Test tool parity test (mode: affected)
    const testInput = {
      mode: "affected",
      executionMode: "sync",
      force: true,
    };
    const parsedTest = DeliveryTestInputSchema.parse(testInput);
    const cliTestResult = await testDelivery(parsedTest);
    const mcpTestCall = await client.callTool({
      name: "delivery_test",
      arguments: testInput,
    });
    const mcpTestResult = JSON.parse(mcpTestCall.content[0].text);

    assert.strictEqual(mcpTestResult.status, cliTestResult.status);
    assert.strictEqual(mcpTestResult.mode, cliTestResult.mode);
    assert.strictEqual(mcpTestResult.cached, cliTestResult.cached);
    assert.deepStrictEqual(mcpTestResult.counts, cliTestResult.counts);
    assert.deepStrictEqual(mcpTestResult.diagnostics, cliTestResult.diagnostics);
  } finally {
    try {
      await client.close();
    } finally {
      process.chdir(originalCwd);
      await fs.rm(fixtureRoot, { recursive: true, force: true });
    }
  }
});
