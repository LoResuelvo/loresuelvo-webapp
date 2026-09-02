import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import path from "node:path";

async function runSmokeTest() {
  const serverPath = path.resolve("tools/delivery-mcp/server.mjs");
  const child = spawn(process.execPath, [serverPath], {
    stdio: ["pipe", "pipe", "inherit"],
    cwd: process.cwd(),
  });

  let buffer = "";
  const pendingRequests = new Map();

  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep last incomplete line

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const message = JSON.parse(line.trim());
        if (message.id && pendingRequests.has(message.id)) {
          const { resolve, reject } = pendingRequests.get(message.id);
          pendingRequests.delete(message.id);
          if (message.error) {
            reject(new Error(`JSON-RPC error ${message.error.code}: ${message.error.message}`));
          } else {
            resolve(message.result);
          }
        }
      } catch (err) {
        console.error("Non-JSON stdout:", line);
      }
    }
  });

  function sendRequest(method, params, id) {
    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });
      const req = JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        params,
      });
      child.stdin.write(req + "\n");
    });
  }

  function sendNotification(method, params) {
    const notif = JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
    });
    child.stdin.write(notif + "\n");
  }

  try {
    // 1. Handshake: initialize
    console.log("1. Sending initialize...");
    const initResult = await sendRequest(
      "initialize",
      {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "delivery-smoke-test",
          version: "1.0.0",
        },
      },
      1
    );
    assert.ok(initResult.capabilities, "Server returned capabilities");
    assert.strictEqual(initResult.serverInfo?.name, "loresuelvo-delivery");

    // 2. Initialized notification
    console.log("2. Sending initialized notification...");
    sendNotification("notifications/initialized", {});

    // 3. List tools
    console.log("3. Sending tools/list...");
    const toolsResult = await sendRequest("tools/list", {}, 2);
    assert.ok(Array.isArray(toolsResult.tools), "Tools array returned");
    const inspectTool = toolsResult.tools.find((t) => t.name === "delivery_inspect");
    assert.ok(inspectTool, "delivery_inspect tool is registered");

    // 4. Call delivery_inspect
    console.log("4. Calling delivery_inspect...");
    const callResult = await sendRequest(
      "tools/call",
      {
        name: "delivery_inspect",
        arguments: {
          intent: "prepare_commit",
        },
      },
      3
    );

    assert.ok(callResult.content?.[0]?.text, "Result text present");
    const parsed = JSON.parse(callResult.content[0].text);

    // Validate canonical schema properties
    assert.strictEqual(parsed.schemaVersion, 1, "schemaVersion must be 1");
    assert.ok(
      ["ready", "review_required", "blocked", "needs_input", "no_changes"].includes(parsed.status),
      `Invalid status: ${parsed.status}`
    );
    assert.ok(typeof parsed.snapshotHash === "string", "snapshotHash must be string");
    assert.ok(parsed.repository && typeof parsed.repository.branch === "string", "branch must be string");
    assert.ok(parsed.gate && typeof parsed.gate.id === "string", "gate.id must be string");
    assert.ok(parsed.maintainability && Array.isArray(parsed.maintainability.filesReviewed), "filesReviewed array");
    assert.ok(Array.isArray(parsed.diagnostics), "diagnostics must be array");

    console.log("Smoke test passed successfully!");
    console.log("Sample inspection output:", JSON.stringify(parsed, null, 2));
  } finally {
    child.kill("SIGTERM");
  }
}

runSmokeTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Smoke test failed:", err);
    process.exit(1);
  });
