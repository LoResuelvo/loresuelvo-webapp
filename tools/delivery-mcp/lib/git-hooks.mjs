import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { findRepoRoot } from "./repo-root.mjs";
import { prepareDelivery } from "./prepare-delivery.mjs";
import { loadDeliveryContext, consumeDeliveryContext } from "./delivery-context.mjs";
import {
  consumePreparedEvidence,
  recordCommitEvidence,
  getLastPreparedEvidence,
  listCommitEvidence,
  loadEvidenceRecord,
  verifyCommitEvidence,
} from "./delivery-ledger.mjs";
import { inspectCi } from "./ci-provider.mjs";


const ALLOWED_TYPES = new Set([
  "chore",
  "feat",
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
 * - Allowed types follow repository commit governance, including feat for product work
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

  // 2. Format: <type>[XX]: <description> or <type>: <description>
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

  // 3. Validate US ID against active context
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

  const alreadyRecorded = await verifyCommitEvidence({ repoRoot: root, commitSha });
  if (alreadyRecorded.valid) {
    return {
      recorded: true,
      commitSha,
      ledgerEntry: alreadyRecorded.entry,
      reused: true,
    };
  }

  const prepared = await getLastPreparedEvidence({ repoRoot: root });
  if (!prepared || prepared.status !== "passed") {
    return {
      recorded: false,
      commitSha,
      ledgerEntry: null,
      reason: "MISSING_PREPARED_EVIDENCE",
    };
  }
  if (prepared.schemaVersion !== 2 || prepared.consumedByCommitSha) {
    return {
      recorded: false,
      commitSha,
      ledgerEntry: null,
      reason: "STALE_PREPARED_EVIDENCE",
    };
  }

  const parentsLine = execFileSync("git", ["rev-list", "--parents", "-n", "1", commitSha], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const [, ...parents] = parentsLine.split(/\s+/).filter(Boolean);
  const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const treeSha = execFileSync("git", ["rev-parse", "HEAD^{tree}"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const stagedFiles = [...(prepared.stagedFiles || [])].sort();

  const identityMatches =
    parents.length <= 1 &&
    (parents[0] || null) === prepared.parentHeadSha &&
    branch === prepared.branch &&
    treeSha === prepared.stagedTreeSha;
  if (!identityMatches) {
    return {
      recorded: false,
      commitSha,
      ledgerEntry: null,
      reason: "PREPARED_EVIDENCE_COMMIT_MISMATCH",
    };
  }

  let loaded;
  try {
    loaded = await loadEvidenceRecord({ repoRoot: root, recordPath: prepared.recordPath });
  } catch {
    return {
      recorded: false,
      commitSha,
      ledgerEntry: null,
      reason: "PREPARED_EVIDENCE_RECORD_INVALID",
    };
  }
  if (
    loaded.digest !== prepared.recordDigest ||
    loaded.record.status !== "passed" ||
    loaded.record.snapshotHash !== prepared.snapshotHash ||
    loaded.record.runKey !== prepared.runKey ||
    loaded.record.gate?.id !== prepared.gateId ||
    loaded.record.policy?.hash !== prepared.policyHash
  ) {
    return {
      recorded: false,
      commitSha,
      ledgerEntry: null,
      reason: "PREPARED_EVIDENCE_RECORD_MISMATCH",
    };
  }

  const committedMessage = execFileSync("git", ["log", "-1", "--format=%B", commitSha], {
    cwd: root,
    encoding: "utf8",
  });
  const committedMessageValidation = validateCommitMessage(committedMessage);
  if (!committedMessageValidation.valid) {
    return {
      recorded: false,
      commitSha,
      ledgerEntry: null,
      reason: "INVALID_COMMIT_MESSAGE",
    };
  }

  const ledgerEntry = await recordCommitEvidence({
    repoRoot: root,
    commitSha,
    snapshotHash: prepared.snapshotHash,
    runKey: prepared.runKey,
    recordPath: prepared.recordPath,
    recordDigest: prepared.recordDigest,
    branch,
    parentSha: prepared.parentHeadSha,
    treeSha,
    stagedFiles,
    gateId: prepared.gateId,
    policyHash: prepared.policyHash,
    intent: prepared.intent,
    usId: prepared.usId || committedMessageValidation.usId,
    featureFile: prepared.featureFile,
    scenarioName: prepared.scenarioName,
    scopeFiles: prepared.scopeFiles,
  });
  await consumePreparedEvidence({ repoRoot: root, commitSha });
  await consumeDeliveryContext({ repoRoot: root });

  return { recorded: Boolean(ledgerEntry), commitSha, ledgerEntry };
}

export async function runPrePushHook({ repoRoot, stdinLines = [], ciProvider = null } = {}) {
  const root = findRepoRoot(repoRoot);

  for (const line of stdinLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 4) continue;

    const [, localSha, , remoteSha] = parts;

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

    // Verify each commit has exact local evidence and a valid message.
    for (const sha of commits) {
      const verified = await verifyCommitEvidence({ repoRoot: root, commitSha: sha });
      if (!verified.valid) {
        return {
          passed: false,
          reason: "INVALID_COMMIT_EVIDENCE",
          evidenceReason: verified.reason,
          message: `Commit ${sha.slice(0, 8)} does not have valid delivery evidence (${verified.reason}). Run delivery prepare and create a matching commit.`,
        };
      }

      const commitMessage = execFileSync("git", ["log", "-1", "--format=%B", sha], {
        cwd: root,
        encoding: "utf8",
      });
      const messageValidation = validateCommitMessage(commitMessage);
      if (!messageValidation.valid) {
        return {
          passed: false,
          reason: "INVALID_PUSHED_COMMIT_MESSAGE",
          message: `Commit ${sha.slice(0, 8)} has an invalid message: ${messageValidation.message}`,
        };
      }
    }

    // Check CI of prior commits registered in the ledger
    if (process.env.DELIVERY_SKIP_CI_CHECK !== "1") {
      let priorShas = [];
      try {
        const currentSet = new Set(commits);
        const entries = await listCommitEvidence({ repoRoot: root });
        priorShas = entries.map((entry) => entry.commitSha).filter((s) => !currentSet.has(s));
      } catch {
        priorShas = [];
      }

      const recentPriorShas = priorShas.slice(-5).reverse();
      const maxPendingWindow = Number(process.env.DELIVERY_CI_MAX_PENDING || 2);
      let pendingCount = 0;

      for (const priorSha of recentPriorShas) {
        try {
          const ci = await inspectCi({ sha: priorSha, repoRoot: root, provider: ciProvider });
          if (ci.status === "failed" || ci.status === "timed_out") {
            return {
              passed: false,
              reason: "PRIOR_COMMIT_CI_FAILED",
              message: `Pre-push blocked: prior commit ${priorSha.slice(0, 8)} failed CI in GitHub Actions. Fix the failure before pushing new commits.`,
              sha: priorSha,
            };
          }
          if (ci.status === "in_progress" || ci.status === "queued") {
            pendingCount += 1;
            if (pendingCount > maxPendingWindow) {
              return {
                passed: false,
                reason: "CI_PENDING_WINDOW_EXCEEDED",
                message: `Pre-push blocked: ${pendingCount} prior commits currently have CI in progress (exceeds window of ${maxPendingWindow}). Wait for CI to complete.`,
              };
            }
          }
        } catch {
          // If CI inspection throws (offline / network issue), do not block falsely
        }
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
