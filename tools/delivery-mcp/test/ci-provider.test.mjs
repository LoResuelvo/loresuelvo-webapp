import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  MockCiProvider,
  GitHubActionsProvider,
  inspectCi,
  setCiProvider,
} from "../lib/ci-provider.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { server } from "../server.mjs";

test("MockCiProvider: soporta todos los estados normalizados de CI", async () => {
  const sha = "a".repeat(40);
  const mock = new MockCiProvider({
    [sha]: {
      status: "queued",
      workflow: { id: 101, name: "Deploy & Test" },
    },
  });

  const resQueued = await mock.inspectCommit(sha);
  assert.strictEqual(resQueued.status, "queued");
  assert.strictEqual(resQueued.retryable, false);

  // in_progress
  mock.setFixture(sha, { status: "in_progress", workflow: { id: 101, name: "Deploy & Test" } });
  const resProgress = await mock.inspectCommit(sha);
  assert.strictEqual(resProgress.status, "in_progress");
  assert.strictEqual(resProgress.retryable, false);

  // passed
  mock.setFixture(sha, { status: "passed", workflow: { id: 101, name: "Deploy & Test" } });
  const resPassed = await mock.inspectCommit(sha);
  assert.strictEqual(resPassed.status, "passed");
  assert.strictEqual(resPassed.retryable, false);

  // failed con extracto acotado
  mock.setFixture(sha, {
    status: "failed",
    workflow: { id: 101, name: "Deploy & Test" },
    failure: {
      message: "Build step failed with exit code 1",
      excerpt: "Error: Module not found\n  at index.ts:15",
    },
  });
  const resFailed = await mock.inspectCommit(sha);
  assert.strictEqual(resFailed.status, "failed");
  assert.strictEqual(resFailed.retryable, true);
  assert.ok(resFailed.failure.message.includes("Build step failed"));
  assert.ok(resFailed.failure.excerpt.includes("Module not found"));

  // not_found
  const resNotFound = await mock.inspectCommit("b".repeat(40));
  assert.strictEqual(resNotFound.status, "not_found");
  assert.strictEqual(resNotFound.workflow, null);

  // timed_out y cancelled
  mock.setFixture(sha, { status: "timed_out" });
  const resTimedOut = await mock.inspectCommit(sha);
  assert.strictEqual(resTimedOut.status, "timed_out");
  assert.strictEqual(resTimedOut.retryable, true);

  mock.setFixture(sha, { status: "cancelled" });
  const resCancelled = await mock.inspectCommit(sha);
  assert.strictEqual(resCancelled.status, "cancelled");
  assert.strictEqual(resCancelled.retryable, true);
});

test("GitHubActionsProvider: normaliza respuestas crudas de GitHub Actions", () => {
  const provider = new GitHubActionsProvider();

  // Completed + success -> passed
  const normalSuccess = provider.normalizeRun("abc1234", {
    databaseId: 555,
    name: "CI Pipeline",
    status: "completed",
    conclusion: "success",
    url: "https://github.com/test/run/555",
  });
  assert.strictEqual(normalSuccess.status, "passed");
  assert.strictEqual(normalSuccess.retryable, false);

  // Completed + failure -> failed con resumen
  const normalFail = provider.normalizeRun("abc1234", {
    databaseId: 556,
    name: "CI Pipeline",
    status: "completed",
    conclusion: "failure",
    url: "https://github.com/test/run/556",
  });
  assert.strictEqual(normalFail.status, "failed");
  assert.strictEqual(normalFail.retryable, true);
  assert.ok(normalFail.failure.message.includes("failed on commit abc1234"));

  // Queued -> queued
  const normalQueue = provider.normalizeRun("abc1234", {
    databaseId: 557,
    name: "CI Pipeline",
    status: "queued",
  });
  assert.strictEqual(normalQueue.status, "queued");
  assert.strictEqual(normalQueue.retryable, false);
});

test("DELIVERY_SKIP_CI_CHECK: omite chequeo de red y devuelve passed", async () => {
  const original = process.env.DELIVERY_SKIP_CI_CHECK;
  try {
    process.env.DELIVERY_SKIP_CI_CHECK = "1";
    const provider = new GitHubActionsProvider();
    const result = await provider.inspectCommit("c".repeat(40));
    assert.strictEqual(result.status, "passed");
  } finally {
    process.env.DELIVERY_SKIP_CI_CHECK = original || "";
  }
});

test("paridad CLI y MCP para delivery_ci_inspect", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "ci-parity-test", version: "1.0.0" });

  const testSha = "d".repeat(40);
  const mock = new MockCiProvider({
    [testSha]: {
      status: "passed",
      workflow: { id: 777, name: "Main CI" },
    },
  });
  setCiProvider(mock);

  try {
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    // 1. Direct CLI / function call
    const directResult = await inspectCi({ sha: testSha });

    // 2. MCP call
    const mcpCall = await client.callTool({
      name: "delivery_ci_inspect",
      arguments: { sha: testSha },
    });
    const mcpResult = JSON.parse(mcpCall.content[0].text);

    assert.strictEqual(mcpResult.status, directResult.status);
    assert.strictEqual(mcpResult.sha, directResult.sha);
    assert.strictEqual(mcpResult.workflow.id, directResult.workflow.id);
    assert.strictEqual(mcpResult.retryable, directResult.retryable);
  } finally {
    await client.close();
    setCiProvider(null);
  }
});
