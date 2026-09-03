import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { findRepoRoot } from "./repo-root.mjs";
import { prepareDelivery } from "./prepare-delivery.mjs";
import { loadDeliveryContext, consumeDeliveryContext } from "./delivery-context.mjs";
import {
  recordCommitEvidence,
  getLastPreparedEvidence,
  hasCommitEvidence,
} from "./delivery-ledger.mjs";

const ALLOWED_TYPES = new Set([
  "chore",
  "docs",
  "test",
  "ci",
  "fix",
  "refactor",
  "build",
  "style",
  "revert",
]);

function normalizeUsId(usId) {
  if (!usId || typeof usId !== "string") return null;
  return usId.trim().toUpperCase().replace(/^US[-_]?/i, "");
}

/**
 * Validates commit message structure according to Lo Resuelvo commit governance.
 * - Allowed types: chore, docs, test, ci, fix, refactor (and build, style, revert)
 * - Rejects 'feat'
 * - Rejects scopes in parentheses like '(agent)' or '(scope)'
 * - Validates US ID against active context
 */
export function validateCommitMessage(rawMessage, activeContext = null) {
  if (!rawMessage || typeof rawMessage !== "string") {
    return { valid: false, reason: "EMPTY_MESSAGE", message: "Commit message cannot be empty" };
  }

  // Strip git comments and leading/trailing empty lines
  const lines = rawMessage
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (lines.length === 0) {
    return { valid: false, reason: "EMPTY_MESSAGE", message: "Commit message cannot be empty" };
  }

  const subject = lines[0];

  // 1. Rejects (agent) and any parentheses
  if (subject.includes("(agent)")) {
    return {
      valid: false,
      reason: "AGENT_SCOPE_FORBIDDEN",
      message: "Commit message cannot contain '(agent)'",
    };
  }
  if (/\([^)]*\)/.test(subject)) {
    return {
      valid: false,
      reason: "PAREN_SCOPE_FORBIDDEN",
      message:
        "Scopes in parentheses are forbidden in commit messages. Use <type>[XX]: description or <type>: description.",
    };
  }

  // 2. Rejects 'feat'
  if (/^feat(?:\[[^\]]+\])?\s*:/i.test(subject)) {
    return {
      valid: false,
      reason: "FEAT_TYPE_FORBIDDEN",
      message:
        "Commit type 'feat' is rejected on main. Use chore, docs, test, ci, fix, or refactor.",
    };
  }

  // 3. Format: <type>[XX]: <description> or <type>: <description>
  const match = subject.match(/^([a-zA-Z]+)(?:\[([a-zA-Z0-9_.-]+)\])?:\s+(.+)$/);
  if (!match) {
    return {
      valid: false,
      reason: "INVALID_FORMAT",
      message:
        "Invalid commit message format. Expected '<type>[XX]: description' or '<type>: description'",
    };
  }

  const [, rawType, usId, description] = match;
  const type = rawType.toLowerCase();

  if (!ALLOWED_TYPES.has(type)) {
    return {
      valid: false,
      reason: "INVALID_TYPE",
      message: `Invalid commit type '${rawType}'. Allowed types are: ${Array.from(ALLOWED_TYPES).join(", ")}`,
    };
  }

  if (!description || description.trim().length === 0) {
    return {
      valid: false,
      reason: "EMPTY_DESCRIPTION",
      message: "Commit message description cannot be empty",
    };
  }

  // 4. Validate US ID against active context
  if (activeContext && !activeContext.consumed) {
    if (activeContext.usId) {
      if (usId) {
        const normMsgUs = normalizeUsId(usId);
        const normCtxUs = normalizeUsId(activeContext.usId);
        if (normMsgUs !== normCtxUs && usId !== activeContext.usId) {
          return {
            valid: false,
            reason: "CONTEXT_US_CONFLICT",
            message: `Commit message US ID (${usId}) contradicts active delivery context US ID (${activeContext.usId})`,
          };
        }
      } else if (activeContext.intent === "close_us") {
        return {
          valid: false,
          reason: "MISSING_US_IN_MESSAGE",
          message: `Active delivery context specifies US '${activeContext.usId}', which must be declared as [${activeContext.usId}] in commit message`,
        };
      }
    }
  }

  return { valid: true, type, usId: usId || null, description };
}

export async function runPreCommitHook({ repoRoot } = {}) {
  const root = findRepoRoot(repoRoot);
  const outcome = await prepareDelivery({ repoRoot: root });

  if (outcome.status !== "passed") {
    return {
      passed: false,
      outcome,
      message: `Pre-commit check failed with status '${outcome.status}' (expected 'passed'). Check diagnostics for details.`,
    };
  }

  return { passed: true, outcome };
}

export async function runCommitMsgHook({ repoRoot, messageFilePath } = {}) {
  const root = findRepoRoot(repoRoot);
  if (!messageFilePath) {
    throw new Error("Missing commit message file path parameter");
  }

  const absPath = path.isAbsolute(messageFilePath)
    ? messageFilePath
    : path.resolve(root, messageFilePath);
  const content = await fs.readFile(absPath, "utf8");
  const activeContext = await loadDeliveryContext({ repoRoot: root });

  const validation = validateCommitMessage(content, activeContext);
  if (!validation.valid) {
    return {
      passed: false,
      reason: validation.reason,
      message: validation.message,
    };
  }

  return { passed: true, validation };
}

export async function runPostCommitHook({ repoRoot } = {}) {
  const root = findRepoRoot(repoRoot);
  let commitSha = "";
  try {
    commitSha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch (error) {
    throw new Error(`Failed to resolve HEAD commit: ${error.message}`);
  }

  const prepared = await getLastPreparedEvidence({ repoRoot: root });
  let ledgerEntry = null;
  if (prepared && prepared.status === "passed") {
    ledgerEntry = await recordCommitEvidence({
      repoRoot: root,
      commitSha,
      snapshotHash: prepared.snapshotHash,
      runKey: prepared.runKey,
      recordPath: prepared.recordPath,
    });
  }

  // Consume any active delivery context
  try {
    await consumeDeliveryContext({ repoRoot: root });
  } catch {
    // ignore
  }

  return { recorded: Boolean(ledgerEntry), commitSha, ledgerEntry };
}

export async function runPrePushHook({ repoRoot, stdinLines = [] } = {}) {
  const root = findRepoRoot(repoRoot);

  for (const line of stdinLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 4) continue;

    const [localRef, localSha, , remoteSha] = parts;

    // Branch deletion (localSha is zeroes)
    if (/^0+$/.test(localSha)) continue;

    let revRange = "";
    if (/^0+$/.test(remoteSha)) {
      // Remote does not exist yet; find commits not in remote branches
      revRange = `${localSha} --not --remotes`;
    } else {
      revRange = `${remoteSha}..${localSha}`;
    }

    let commits = [];
    try {
      const args = ["rev-list", ...revRange.split(" ").filter(Boolean)];
      const out = execFileSync("git", args, { cwd: root, encoding: "utf8" });
      commits = out.trim().split("\n").filter(Boolean);
    } catch {
      commits = [localSha];
    }

    // Policy: One commit, one push
    if (commits.length > 1) {
      return {
        passed: false,
        reason: "MULTIPLE_COMMITS_PUSH",
        message: `Policy enforces 'one commit, one push'. Multiple commits detected for push (${commits.length} commits): ${commits.join(", ")}`,
      };
    }

    // Verify each commit has local evidence in ledger
    for (const sha of commits) {
      const hasEv = await hasCommitEvidence({ repoRoot: root, commitSha: sha });
      if (!hasEv) {
        return {
          passed: false,
          reason: "MISSING_EVIDENCE_IN_LEDGER",
          message: `Commit ${sha.slice(0, 8)} does not have associated local delivery evidence in ledger. Run delivery prepare before committing.`,
        };
      }
    }
  }

  return { passed: true };
}

export async function installHooks({ repoRoot } = {}) {
  const root = findRepoRoot(repoRoot);
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], { cwd: root });

  const hooksDir = path.resolve(root, ".githooks");
  try {
    const entries = await fs.readdir(hooksDir);
    for (const entry of entries) {
      const hookPath = path.join(hooksDir, entry);
      await fs.chmod(hookPath, 0o755);
    }
  } catch {
    // ignore
  }

  return { installed: true, hooksPath: ".githooks" };
}

export async function getHooksStatus({ repoRoot } = {}) {
  const root = findRepoRoot(repoRoot);
  let configuredPath = "";
  try {
    configuredPath = execFileSync("git", ["config", "core.hooksPath"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch {
    configuredPath = "";
  }

  const hooks = ["pre-commit", "commit-msg", "post-commit", "pre-push"];
  const hookStatuses = {};
  for (const hook of hooks) {
    const absPath = path.resolve(root, ".githooks", hook);
    try {
      const stat = await fs.stat(absPath);
      const isExecutable = (stat.mode & 0o111) !== 0;
      hookStatuses[hook] = { exists: true, executable: isExecutable };
    } catch {
      hookStatuses[hook] = { exists: false, executable: false };
    }
  }

  return {
    configured: configuredPath === ".githooks",
    configuredPath,
    hooks: hookStatuses,
  };
}
