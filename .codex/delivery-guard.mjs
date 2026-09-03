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

async function main() {
  const rawCommand = process.argv.slice(2).join(" ") || process.env.CODEX_TOOL_COMMAND || "";
  const root = findRepoRoot();

  const outcome = await runCodexGuard({ repoRoot: root, rawCommand });

  if (!outcome.shouldIntercept) {
    process.exit(0);
  }

  if (outcome.passed) {
    process.stdout.write(
      `[codex-delivery-guard] Delivery gate satisfied (Gate: ${outcome.gateId}, cached: ${outcome.cached})\n`
    );
    process.exit(0);
  } else {
    process.stderr.write(
      `[codex-delivery-guard] Blocked: Delivery status is '${outcome.status}'. Run 'npm run delivery:prepare' to inspect and satisfy required gates before committing.\n`
    );
    process.exit(1);
  }
}

const currentFile = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && path.resolve(process.argv[1]) === currentFile;
if (isMain) {
  main().catch((err) => {
    process.stderr.write(`[codex-delivery-guard] Internal error: ${err.message}\n`);
    process.exit(1);
  });
}
