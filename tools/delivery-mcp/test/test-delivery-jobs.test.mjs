import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { server } from "../server.mjs";
import {
  testDelivery,
  shouldUseDeliveryTestJob,
} from "../lib/test-delivery.mjs";
import { DeliveryTestInputSchema } from "../lib/input-schema.mjs";
import { waitForJob } from "../lib/jobs.mjs";
import { findRepoRoot } from "../lib/repo-root.mjs";

async function createWorkerFixture(repoRoot, t) {
  const fixturePath = path.resolve(repoRoot, ".delivery/runtime/delivery-job-fixture.test.mjs");
  await fs.mkdir(path.dirname(fixturePath), { recursive: true });
  await fs.writeFile(
    fixturePath,
    [
      'import test from "node:test";',
      "test(\"recoverable delivery job\", async () => {",
      "  await new Promise((resolve) => setTimeout(resolve, 150));",
      "});",
      "",
    ].join("\n"),
    "utf8"
  );
  t.after(() => fs.rm(fixturePath, { force: true }));
  return ".delivery/runtime/delivery-job-fixture.test.mjs";
}

test("DeliveryTestInputSchema separa modo funcional de ejecución y conserva paridad sync", async () => {
  assert.strictEqual(DeliveryTestInputSchema.parse({ mode: "unit" }).executionMode, "auto");
  const parsed = DeliveryTestInputSchema.parse({
    mode: "unit",
    testFiles: ["domain/shared/Money.test.ts"],
    executionMode: "sync",
  });
  assert.strictEqual(parsed.mode, "unit");
  assert.strictEqual(parsed.executionMode, "sync");
  assert.strictEqual(parsed.force, false);

  assert.deepStrictEqual(
    DeliveryTestInputSchema.parse({ mode: "scenario", executionMode: "auto" }),
    { mode: "scenario", executionMode: "auto", force: false }
  );

  assert.strictEqual(
    shouldUseDeliveryTestJob({ mode: "unit", executionMode: "auto" }),
    false,
    "focused unit tests stay synchronous in auto"
  );
  assert.strictEqual(shouldUseDeliveryTestJob({ mode: "scenario", executionMode: "auto" }), true);
  assert.strictEqual(shouldUseDeliveryTestJob({ mode: "affected", executionMode: "auto" }), true);
  assert.strictEqual(
    shouldUseDeliveryTestJob({ mode: "diagnostic", executionMode: "auto", diagnosticTimeoutMs: 300000 }),
    true
  );
  assert.strictEqual(
    shouldUseDeliveryTestJob({ mode: "diagnostic", executionMode: "auto", diagnosticTimeoutMs: 180000 }),
    false
  );
  assert.strictEqual(shouldUseDeliveryTestJob({ mode: "unit", executionMode: "job" }), true);
  assert.strictEqual(
    shouldUseDeliveryTestJob({ mode: "scenario", executionMode: "auto", workerJobId: "job-1" }),
    false,
    "a worker must bypass its own deduplication path"
  );
});

test("delivery_test sync mantiene paridad entre core y adaptador MCP", async (t) => {
  const repoRoot = findRepoRoot();
  const fixture = await createWorkerFixture(repoRoot, t);
  const input = {
    mode: "unit",
    testFiles: [fixture],
    executionMode: "sync",
    force: true,
  };

  const direct = await testDelivery({ repoRoot, ...DeliveryTestInputSchema.parse(input) });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "delivery-test-jobs-parity", version: "1.0.0" });
  try {
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const call = await client.callTool({ name: "delivery_test", arguments: input });
    const mcp = JSON.parse(call.content[0].text);
    assert.strictEqual(mcp.status, direct.status);
    assert.strictEqual(mcp.mode, direct.mode);
    assert.deepStrictEqual(mcp.counts, direct.counts);
    assert.deepStrictEqual(mcp.diagnostics, direct.diagnostics);
  } finally {
    await client.close();
  }
});

test("delivery_test job ejecuta un worker real y es recuperable mediante wait", async (t) => {
  const repoRoot = findRepoRoot();
  const fixture = await createWorkerFixture(repoRoot, t);
  const started = await testDelivery({
    repoRoot,
    mode: "unit",
    testFiles: [fixture],
    executionMode: "job",
    force: true,
    timeoutMs: 30000,
  });

  assert.strictEqual(started.status, "job_started");
  assert.strictEqual(started.mode, "unit");
  assert.match(started.jobId, /^job-/);

  const completed = await waitForJob({
    repoRoot,
    jobId: started.jobId,
    timeoutMs: 30000,
    pollIntervalMs: 50,
  });
  assert.strictEqual(completed.status, "passed");
  assert.strictEqual(completed.mode, "unit");
  assert.ok(completed.counts.passed >= 1);
});
