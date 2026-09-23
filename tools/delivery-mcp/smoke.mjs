import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { server } from "./server.mjs";
import { OPERATION_CONTRACTS } from "./lib/operation-contracts.mjs";

async function runSmokeTest() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "delivery-smoke-test", version: "1.0.0" });

  try {
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const toolsResult = await client.listTools();
    assert.strictEqual(OPERATION_CONTRACTS.length, 9);
    assert.deepStrictEqual(toolsResult.tools.map(({ name }) => name), OPERATION_CONTRACTS.map(({ name }) => name));
    const testTool = toolsResult.tools.find((tool) => tool.name === "delivery_test");
    assert.deepStrictEqual(testTool.inputSchema.properties.executionMode.enum, ["sync", "job", "auto"]);
    assert.strictEqual(testTool.inputSchema.properties.async.type, "boolean");

    const testCallResult = await client.callTool({
      name: "delivery_test",
      arguments: { mode: "affected" },
    });
    assert.ok(testCallResult.content?.[0]?.text, "delivery_test result text present");
    const parsedTest = JSON.parse(testCallResult.content[0].text);
    assert.ok(
      ["passed", "failed", "error", "job_started", "running"].includes(parsedTest.status),
      `Invalid test status: ${parsedTest.status}`
    );
    assert.strictEqual(parsedTest.mode, "affected");
    assert.strictEqual(typeof parsedTest.cached, "boolean");
    assert.strictEqual(parsedTest.operation, "delivery_test");
    assert.equal(testCallResult.structuredContent?.operation, "delivery_test");

    const callResult = await client.callTool({
      name: "delivery_inspect",
      arguments: { intent: "prepare_commit" },
    });
    assert.ok(callResult.content?.[0]?.text, "Result text present");
    const parsed = JSON.parse(callResult.content[0].text);
    assert.strictEqual(parsed.schemaVersion, 1);
    assert.ok(
      ["ready", "review_required", "blocked", "needs_input", "no_changes"].includes(parsed.status),
      `Invalid status: ${parsed.status}`
    );
    assert.match(parsed.snapshotHash, /^[a-f0-9]{64}$/);
    assert.ok(parsed.repository && typeof parsed.repository.branch === "string");
    assert.ok(parsed.gate && Array.isArray(parsed.gate.checkIds));
    assert.ok(parsed.maintainability && Array.isArray(parsed.maintainability.filesReviewed));
    assert.ok(Array.isArray(parsed.diagnostics));
    assert.equal(callResult.structuredContent?.operation, "delivery_inspect");

    console.log(`Smoke passed: tools=${toolsResult.tools.length} status=${parsed.status} gate=${parsed.gate.id}`);
  } finally {
    await client.close();
  }
}

runSmokeTest().catch((error) => {
  console.error(`Smoke failed: ${String(error.message || "unknown").split("\n")[0]}`);
  process.exitCode = 1;
});
