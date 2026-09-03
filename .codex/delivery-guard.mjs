#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareDelivery } from "../tools/delivery-mcp/lib/prepare-delivery.mjs";
import { findRepoRoot } from "../tools/delivery-mcp/lib/repo-root.mjs";

/**
 * Anticipatory delivery guard for Codex environments.
 * Checks staged delivery status before git commit is invoked.
 *
 * NOTE: This is an advisory, early-feedback layer. The authoritative
 * enforcement remains the versioned Git hooks in .githooks/.
 */
export async function runCodexGuard({ repoRoot = findRepoRoot(), rawCommand = "" } = {}) {
  // If a command pattern is provided, verify it targets git commit
  if (rawCommand && !/\bgit\s+commit\b/.test(rawCommand)) {
    return { shouldIntercept: false, passed: true, status: "ignored" };
  }

  const result = await prepareDelivery({ repoRoot, intent: "prepare_commit" });
  const passed = result.status === "passed";

  return {
    shouldIntercept: true,
    passed,
    status: result.status,
    gateId: result.gate?.id || "NONE",
    cached: Boolean(result.cached),
    diagnostics: result.diagnostics || [],
  };
}

export function parseCodexHookInput(rawInput) {
  if (!rawInput || !rawInput.trim()) return { toolName: null, rawCommand: "" };
  const parsed = JSON.parse(rawInput);
  return {
    toolName: typeof parsed.tool_name === "string" ? parsed.tool_name : null,
    rawCommand:
      typeof parsed.tool_input?.command === "string" ? parsed.tool_input.command : "",
  };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const argvCommand = process.argv.slice(2).join(" ");
  const hookInput = argvCommand ? null : parseCodexHookInput(await readStdin());
  const rawCommand = argvCommand || hookInput?.rawCommand || "";
  const root = findRepoRoot();

  const outcome = await runCodexGuard({ repoRoot: root, rawCommand });

  if (!outcome.shouldIntercept) {
    process.exit(0);
  }

  if (outcome.passed) {
    process.exit(0);
  } else {
    const diagnostic = outcome.diagnostics?.[0]?.message;
    const reason = diagnostic
      ? `Delivery status '${outcome.status}': ${diagnostic}`
      : `Delivery status is '${outcome.status}'. Run npm run delivery:prepare before committing.`;
    process.stdout.write(
      `${JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: reason,
        },
      })}\n`
    );
    process.exit(0);
  }
}

const currentFile = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && path.resolve(process.argv[1]) === currentFile;
if (isMain) {
  main().catch((err) => {
    process.stderr.write(
      `[codex-delivery-guard] Internal error: ${String(err.message || "unknown").split("\n")[0]}\n`
    );
    process.exit(2);
  });
}
