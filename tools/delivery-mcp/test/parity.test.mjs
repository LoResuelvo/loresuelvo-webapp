import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { server } from "../server.mjs";
import { inspectDelivery } from "../lib/inspect-delivery.mjs";
import { prepareDelivery } from "../lib/prepare-delivery.mjs";
import { finalizeDelivery, verifyHeadDelivery } from "../lib/delivery-finalize.mjs";
import {
  DeliveryInspectInputSchema,
  DeliveryPrepareInputSchema,
  DeliveryFinalizeInputSchema,
  DeliveryVerifyHeadInputSchema,
} from "../lib/input-schema.mjs";

test("paridad CLI / MCP: inspect, prepare, finalize y verify_head producen el mismo resultado semantico", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "parity-test", version: "1.0.0" });

  try {
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

    // 3. Finalize parity test. The current checkout normally blocks before CI
    // unless HEAD already carries exact Gate D evidence; either outcome must be
    // identical because both adapters delegate to the same core.
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

    // 4. Verify-head parity test
    const verifyHeadInput = {
      intent: "close_us",
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
  } finally {
    await client.close();
  }
});
