import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { server } from "../server.mjs";
import { OPERATION_CONTRACTS, operationResponse, renderOperationDocs } from "../lib/operation-contracts.mjs";
import {
  DeliveryPrepareInputSchema,
  DeliveryFinalizeInputSchema,
  DeliveryVerifyHeadInputSchema,
  DeliveryTestInputSchema,
} from "../lib/input-schema.mjs";

const EXPECTED_OPERATIONS = OPERATION_CONTRACTS.map(({ name }) => name);

async function withClient(callback) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "contract-test", version: "1.0.0" });
  try {
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return await callback(client);
  } finally {
    await client.close();
  }
}

test("schemas rechazan typos y comparten el límite de scope", () => {
  for (const schema of [DeliveryPrepareInputSchema, DeliveryTestInputSchema]) {
    assert.equal(schema.safeParse({ mdoe: "job" }).success, false);
  }
  const oversized = { scopeFiles: Array.from({ length: 101 }, (_, i) => `features/${i}.feature`) };
  assert.equal(DeliveryVerifyHeadInputSchema.safeParse(oversized).success, false);
  assert.equal(DeliveryFinalizeInputSchema.safeParse(oversized).success, false);
});

test("catálogo, smoke y documentación cubren las nueve operaciones", async () => {
  assert.equal(EXPECTED_OPERATIONS.length, 9);
  await withClient(async (client) => {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name), EXPECTED_OPERATIONS);
    for (const tool of tools) {
      assert.equal(tool.inputSchema.additionalProperties, false, tool.name);
      assert.equal(tool.outputSchema?.type, "object", tool.name);
      for (const field of ["envelopeVersion", "operation", "status", "subject", "diagnostics", "nextAction", "result"]) {
        assert.ok(tool.outputSchema.required.includes(field), `${tool.name}: ${field}`);
      }
    }
    for (const name of ["delivery_verify_head", "delivery_finalize"]) {
      assert.equal(tools.find((tool) => tool.name === name).inputSchema.properties.scopeFiles.maxItems, 100);
    }
  });
  const smoke = await fs.readFile("tools/delivery-mcp/smoke.mjs", "utf8");
  const docs = await fs.readFile(".delivery/README.md", "utf8");
  assert.ok(smoke.includes("OPERATION_CONTRACTS"));
  assert.ok(docs.includes(renderOperationDocs()));
});

test("MCP conserva texto legado y publica envelope estructurado incluso en error", async () => {
  await withClient(async (client) => {
    for (const name of EXPECTED_OPERATIONS) {
      const response = await client.callTool({ name, arguments: { mdoe: "job" } });
      assert.equal(response.isError, true, name);
      const payload = response.structuredContent;
      assert.equal(payload?.envelopeVersion, 1, name);
      assert.equal(payload?.operation, name, name);
      assert.equal(typeof payload?.status, "string", name);
      assert.equal(typeof payload?.subject?.kind, "string", name);
      assert.ok(Array.isArray(payload?.diagnostics), name);
      assert.equal(typeof payload?.nextAction, "string", name);
      assert.deepEqual(JSON.parse(response.content[0].text), payload, name);
    }
  });
});

test("async tiene una precedencia única sobre mode y rechaza contradicción", () => {
  for (const schema of [DeliveryPrepareInputSchema, DeliveryVerifyHeadInputSchema, DeliveryFinalizeInputSchema]) {
    assert.equal(schema.safeParse({ mode: "sync", async: true }).success, false);
    assert.equal(schema.parse({ async: true }).mode, "job");
    assert.equal(schema.parse({ mode: "job", async: true }).mode, "job");
  }
  assert.equal(DeliveryTestInputSchema.safeParse({ executionMode: "sync", async: true }).success, false);
  assert.equal(DeliveryTestInputSchema.parse({ async: true }).executionMode, "job");
});

test("el envelope conserva resultado legado y guía sólo el siguiente paso permitido", () => {
  const job = operationResponse("delivery_prepare", { status: "job_started", jobId: "job-1" });
  assert.equal(job.subject.kind, "staged");
  assert.equal(job.nextAction, "wait_for_job");
  assert.equal(job.job.jobId, "job-1");

  const prepared = operationResponse("delivery_prepare", {
    status: "passed", snapshotHash: "a".repeat(64), evidence: { recordPath: ".delivery/runtime/runs/x" },
  });
  assert.equal(prepared.nextAction, "commit");
  assert.equal(prepared.subject.snapshotHash, "a".repeat(64));
  assert.deepEqual(prepared.result.evidence, prepared.evidence);

  const blocked = operationResponse("delivery_finalize", { status: "blocked", reason: "HEAD_DRIFT", message: "HEAD changed" });
  assert.equal(blocked.nextAction, "inspect_diagnostics");
  assert.equal(blocked.diagnostics[0].code, "HEAD_DRIFT");
  assert.equal(blocked.reason, "HEAD_DRIFT");

  const cancelled = operationResponse("delivery_job_cancel", { status: "cancelled", jobId: "job-1", result: null });
  assert.equal(cancelled.result, null);
  assert.equal(cancelled.job.jobId, "job-1");
});
