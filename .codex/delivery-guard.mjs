#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findRepoRoot } from "../tools/delivery-mcp/lib/repo-root.mjs";
import { captureGitSnapshot } from "../tools/delivery-mcp/lib/git-snapshot.mjs";
import {
  getLastPreparedEvidence,
  loadEvidenceRecord,
} from "../tools/delivery-mcp/lib/delivery-ledger.mjs";

/**
 * Anticipatory delivery guard for Codex environments.
 * Checks staged delivery status before git commit is invoked.
 * Strictly read-only: never initiates gate tests or executions.
 * Requires a valid prepared receipt for the current staged snapshot.
 */
export async function runCodexGuard({ repoRoot = findRepoRoot(), rawCommand = "" } = {}) {
  // If a command pattern is provided, verify it targets git commit
  if (rawCommand && !/\bgit\s+commit\b/.test(rawCommand)) {
    return { shouldIntercept: false, passed: true, status: "ignored" };
  }

  const snapshot = await captureGitSnapshot({ cwd: repoRoot });
  if (snapshot.stagedFiles.length === 0) {
    return {
      shouldIntercept: true,
      passed: false,
      status: "no_changes",
      message: "No staged changes to commit. Stage files and invoke MCP delivery_prepare first.",
    };
  }

  const prepared = await getLastPreparedEvidence({ repoRoot });
  let hasValidEvidence = false;
  let reason = "MISSING_PREPARED_EVIDENCE";

  if (
    prepared &&
    prepared.schemaVersion === 2 &&
    prepared.status === "passed" &&
    !prepared.consumedByCommitSha
  ) {
    const identityMatches =
      prepared.snapshotHash === snapshot.snapshotHash &&
      prepared.parentHeadSha === snapshot.headSha &&
      prepared.stagedTreeSha === snapshot.stagedTreeSha &&
      prepared.branch === snapshot.branch &&
      JSON.stringify(prepared.stagedFiles || []) ===
        JSON.stringify([...new Set(snapshot.stagedFiles || [])].sort());

    if (identityMatches) {
      try {
        const loaded = await loadEvidenceRecord({ repoRoot, recordPath: prepared.recordPath });
        if (
          loaded.digest === prepared.recordDigest &&
          loaded.record.status === "passed" &&
          loaded.record.snapshotHash === prepared.snapshotHash &&
          loaded.record.runKey === prepared.runKey
        ) {
          hasValidEvidence = true;
        } else {
          reason = "PREPARED_EVIDENCE_RECORD_MISMATCH";
        }
      } catch {
        reason = "PREPARED_EVIDENCE_RECORD_INVALID";
      }
    } else {
      reason = "PREPARED_EVIDENCE_SNAPSHOT_MISMATCH";
    }
  } else if (prepared?.consumedByCommitSha) {
    reason = "STALE_PREPARED_EVIDENCE";
  }

  if (hasValidEvidence) {
    return {
      shouldIntercept: true,
      passed: true,
      status: "passed",
      gateId: prepared.gateId || "NONE",
      cached: true,
    };
  }

  return {
    shouldIntercept: true,
    passed: false,
    status: reason,
    message: "Invoke MCP delivery_prepare for the current staged snapshot",
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
    const reason = outcome.message || "Invoke MCP delivery_prepare for the current staged snapshot";
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
