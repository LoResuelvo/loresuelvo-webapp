import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { server } from "../server.mjs";
import { inspectDelivery } from "../lib/inspect-delivery.mjs";
import { prepareDelivery } from "../lib/prepare-delivery.mjs";
import {
  DeliveryInspectInputSchema,
  DeliveryPrepareInputSchema,
} from "../lib/input-schema.mjs";

test("paridad CLI / MCP: inspect y prepare producen el mismo resultado semantico", async () => {
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
  } finally {
    await client.close();
  }
});
