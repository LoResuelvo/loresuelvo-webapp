import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { findRepoRoot } from "./repo-root.mjs";
import {
  loadDeliveryContext,
  consumeDeliveryContext,
  validateDeliveryContext,
} from "./delivery-context.mjs";
import { captureGitSnapshot, extractUsId } from "./git-snapshot.mjs";
import {
  consumePreparedEvidence,
  recordCommitEvidence,
  getLastPreparedEvidence,
  listCommitEvidence,
  verifyPreparedEvidence,
  queryCommitEvidence,
  markRepairPushConsumed,
  resolveRepairChain,
} from "./delivery-ledger.mjs";
import { inspectCi } from "./ci-provider.mjs";
import { loadDeliveryPolicy } from "./policy-loader.mjs";


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

function rejectDeprecatedCiBypass() {
  if (process.env.DELIVERY_SKIP_CI_CHECK !== undefined && process.env.DELIVERY_SKIP_CI_CHECK !== "") {
    return {
      passed: false,
      reason: "DEPRECATED_CI_BYPASS_REJECTED",
      message:
        "DELIVERY_SKIP_CI_CHECK is deprecated and forbidden. Use repair_ci workflow for CI failure remediation.",
    };
  }
  return null;
}

export async function runPreCommitHook({ repoRoot } = {}) {
  const deprecatedBypass = rejectDeprecatedCiBypass();
  if (deprecatedBypass) return deprecatedBypass;

  const root = findRepoRoot(repoRoot);
  const requireEvidence = process.env.DELIVERY_REQUIRE_EVIDENCE === "1";

  let snapshot;
  try {
    snapshot = await captureGitSnapshot({ cwd: root });
  } catch (error) {
    return {
      passed: false,
      reason: "GIT_ERROR",
      message: `Failed to capture staged snapshot: ${error.message}`,
    };
  }

  const receipt = await verifyPreparedEvidence({ repoRoot: root, snapshot });
  const verifiedReason = receipt.reason;

  if (receipt.valid) {
    return {
      passed: true,
      verified: true,
      gateId: receipt.prepared.gateId || "NONE",
      prepared: receipt.prepared,
    };
  }

  if (requireEvidence) {
    return {
      passed: false,
      verified: false,
      reason: verifiedReason,
      message: `Delivery evidence required (DELIVERY_REQUIRE_EVIDENCE=1). Invoke delivery_prepare for the staged snapshot before committing.`,
    };
  }

  return {
    passed: true,
    verified: false,
    reason: verifiedReason,
    warning: `Proceeding without verified delivery evidence (not_run). Use delivery_prepare to verify gates locally.`,
  };
}

export async function runCommitMsgHook({ repoRoot, messageFilePath } = {}) {
  const deprecatedBypass = rejectDeprecatedCiBypass();
  if (deprecatedBypass) return deprecatedBypass;

  const root = findRepoRoot(repoRoot);
  if (!messageFilePath) {
    throw new Error("Missing commit message file path parameter");
  }

  const absPath = path.isAbsolute(messageFilePath)
    ? messageFilePath
    : path.resolve(root, messageFilePath);
  const content = await fs.readFile(absPath, "utf8");
  const storedContext = await loadDeliveryContext({ repoRoot: root });
  let activeContext = null;
  let contextValidation = null;

  if (storedContext) {
    try {
      const snapshot = await captureGitSnapshot({ cwd: root, proposedCommitMessage: content });
      contextValidation = validateDeliveryContext({
        context: storedContext,
        snapshot,
        proposedCommitMessage: content,
      });
      if (contextValidation.valid || contextValidation.conflict) {
        activeContext = storedContext;
      }
    } catch {
      contextValidation = { valid: false, expired: true, reason: "CONTEXT_SNAPSHOT_UNAVAILABLE" };
    }
  }

  const validation = validateCommitMessage(content, activeContext);
  if (!validation.valid) {
    return {
      passed: false,
      reason: validation.reason,
      message: validation.message,
    };
  }

  return { passed: true, validation, contextValidation };
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

  const alreadyRecorded = await queryCommitEvidence({ repoRoot: root, commitSha });
  if (alreadyRecorded.valid) {
    return {
      recorded: true,
      commitSha,
      ledgerEntry: alreadyRecorded.entry,
      reused: true,
      verificationStatus: "passed",
    };
  }
  if (alreadyRecorded.state === "corrupt") {
    return {
      recorded: false,
      blocked: true,
      commitSha,
      reason: "CORRUPT_COMMIT_EVIDENCE",
      evidenceReason: alreadyRecorded.reason,
    };
  }
  if (alreadyRecorded.state === "not_run") {
    return {
      recorded: true,
      commitSha,
      ledgerEntry: alreadyRecorded.entry,
      reused: true,
      verificationStatus: "not_run",
      reason: alreadyRecorded.reason,
    };
  }

  const committedMessage = execFileSync("git", ["log", "-1", "--format=%B", commitSha], {
    cwd: root,
    encoding: "utf8",
  });
  const committedMessageValidation = validateCommitMessage(committedMessage);
  const inferredUsId = committedMessageValidation.valid
    ? committedMessageValidation.usId
    : extractUsId(committedMessage);

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

  let commitFiles = [];
  try {
    const rawFiles = execFileSync(
      "git",
      ["diff-tree", "--root", "--no-commit-id", "--name-only", "-r", "-z", commitSha],
      { cwd: root, encoding: "buffer" }
    );
    commitFiles = rawFiles.toString("utf8").split("\0").filter(Boolean).sort();
  } catch {
    commitFiles = [];
  }

  const prepared = await getLastPreparedEvidence({ repoRoot: root });
  let matchingReceipt = null;

  if (prepared && parents.length <= 1) {
    const receipt = await verifyPreparedEvidence({
      repoRoot: root,
      prepared,
      snapshot: {
        snapshotHash: prepared.snapshotHash,
        headSha: parents[0] || null,
        stagedTreeSha: treeSha,
        branch,
        stagedFiles: commitFiles,
      },
    });
    if (receipt.valid) matchingReceipt = receipt.prepared;
  }

  if (matchingReceipt) {
    const ledgerEntry = await recordCommitEvidence({
      repoRoot: root,
      commitSha,
      verificationStatus: "passed",
      snapshotHash: matchingReceipt.snapshotHash,
      runKey: matchingReceipt.runKey,
      recordPath: matchingReceipt.recordPath,
      recordDigest: matchingReceipt.recordDigest,
      branch,
      parentSha: matchingReceipt.parentHeadSha,
      treeSha,
      stagedFiles: matchingReceipt.stagedFiles || commitFiles,
      gateId: matchingReceipt.gateId,
      policyHash: matchingReceipt.policyHash,
      intent: matchingReceipt.intent,
      usId: matchingReceipt.usId || inferredUsId,
      featureFile: matchingReceipt.featureFile,
      scenarioName: matchingReceipt.scenarioName,
      scopeFiles: matchingReceipt.scopeFiles,
      repairsSha: matchingReceipt.repairsSha || null,
      supersedes: matchingReceipt.supersedes || [],
      repairStatus: matchingReceipt.repairStatus || null,
      repairedFailure: matchingReceipt.repairedFailure || null,
    });
    await consumePreparedEvidence({ repoRoot: root, commitSha });
    await consumeDeliveryContext({ repoRoot: root });

    return {
      recorded: true,
      commitSha,
      ledgerEntry,
      verificationStatus: "passed",
    };
  }

  // Record as not_run without consuming receipt or delivery context
  const notRunReason = !prepared
    ? "NO_PREPARED_RECEIPT"
    : prepared.consumedByCommitSha
    ? "STALE_PREPARED_RECEIPT"
    : "PREPARED_EVIDENCE_MISMATCH";

  const ledgerEntry = await recordCommitEvidence({
    repoRoot: root,
    commitSha,
    verificationStatus: "not_run",
    notRunReason,
    branch,
    parentSha: parents[0] || null,
    treeSha,
    stagedFiles: commitFiles,
    usId: inferredUsId,
  });

  return {
    recorded: true,
    commitSha,
    ledgerEntry,
    verificationStatus: "not_run",
    reason: notRunReason,
  };
}

export async function runPrePushHook({ repoRoot, stdinLines = [], ciProvider = null } = {}) {
  const deprecatedBypass = rejectDeprecatedCiBypass();
  if (deprecatedBypass) return deprecatedBypass;

  const root = findRepoRoot(repoRoot);
  const requireEvidence = process.env.DELIVERY_REQUIRE_EVIDENCE === "1";
  let maxInFlightCommits = null;

  try {
    const policy = await loadDeliveryPolicy({ repoRoot: root });
    maxInFlightCommits = policy.ci.maxInFlightCommits;
  } catch (error) {
    return {
      passed: false,
      reason: "INVALID_DELIVERY_POLICY",
      message: `Pre-push blocked: cannot load CI policy (${error.message}).`,
    };
  }

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

    let localEvidence = null;
    for (const sha of commits) {
      const evidence = await queryCommitEvidence({ repoRoot: root, commitSha: sha });
      localEvidence = evidence;

      if (evidence.state === "corrupt") {
        return {
          passed: false,
          reason: "INVALID_COMMIT_EVIDENCE",
          evidenceReason: evidence.reason,
          message: `Commit ${sha.slice(0, 8)} has corrupted or altered delivery evidence (${evidence.reason}).`,
        };
      }

      if (evidence.state === "missing") {
        return {
          passed: false,
          reason: "INVALID_COMMIT_EVIDENCE",
          evidenceReason: evidence.reason,
          message: `Commit ${sha.slice(0, 8)} does not have valid delivery evidence (${evidence.reason}). Run delivery prepare and create a matching commit.`,
        };
      }

      if (evidence.state === "not_run") {
        if (requireEvidence) {
          return {
            passed: false,
            reason: "UNVERIFIED_COMMIT_PUSH_BLOCKED",
            evidenceReason: evidence.reason,
            message: `Push blocked: commit ${sha.slice(0, 8)} was not verified locally and DELIVERY_REQUIRE_EVIDENCE=1.`,
          };
        }
        // In normal mode, not_run commits are permitted.
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
    let priorShas = [];
    try {
      const currentSet = new Set(commits);
      const entries = await listCommitEvidence({ repoRoot: root });
      priorShas = entries.map((entry) => entry.commitSha).filter((s) => !currentSet.has(s));
    } catch {
      priorShas = [];
    }

    // Inspect one commit beyond the allowed window so an already-overflowed
    // ledger cannot hide the oldest pending or failed run.
    const recentPriorShas = priorShas.slice(-(maxInFlightCommits + 1)).reverse();
    let pendingCount = 0;

    let supersededSet = new Set();
    try {
      const repairResolution = await resolveRepairChain({ repoRoot: root, ciProvider });
      supersededSet = new Set((repairResolution.supersededFailures || []).map((s) => s.toLowerCase()));
    } catch {
      supersededSet = new Set();
    }

    for (const priorSha of recentPriorShas) {
      let ci;
      try {
        ci = await inspectCi({ sha: priorSha, repoRoot: root, provider: ciProvider });
      } catch {
        return {
          passed: false,
          reason: "CI_INSPECTION_FAILED",
          message: "Pre-push blocked: could not inspect remote CI.",
        };
      }

      if (["failed", "timed_out", "cancelled"].includes(ci.status)) {
        if (supersededSet.has(priorSha.toLowerCase())) {
          // Historical failure formally superseded by a validated repair; does not block
          continue;
        }

        const localEntry = localEvidence?.entry;
        const normalizedPrior = priorSha.toLowerCase();
        const normalizedRepairs = localEntry?.repairsSha ? String(localEntry.repairsSha).toLowerCase() : "";
        const shaMatches =
          Boolean(normalizedRepairs) &&
          (normalizedRepairs === normalizedPrior ||
            normalizedPrior.startsWith(normalizedRepairs) ||
            normalizedRepairs.startsWith(normalizedPrior));

        const isValidRepair =
          localEvidence?.valid &&
          localEvidence?.state === "verified" &&
          localEntry?.intent === "repair_ci" &&
          localEntry?.gateId === "R" &&
          shaMatches;

        if (isValidRepair) {
          if (localEntry.repairPushConsumed) {
            return {
              passed: false,
              reason: "REPAIR_RECEIPT_ALREADY_CONSUMED",
              message: `Pre-push blocked: repair authorization for commit ${priorSha.slice(0, 8)} has already been consumed for a push.`,
              sha: localSha,
            };
          }
          await markRepairPushConsumed({ repoRoot: root, commitSha: localSha });
          localEntry.repairPushConsumed = true;
          continue;
        }

        return {
          passed: false,
          reason: "PRIOR_COMMIT_CI_FAILED",
          message: `Pre-push blocked: prior commit ${priorSha.slice(0, 8)} failed CI in GitHub Actions. Fix the failure before pushing new commits.`,
          sha: priorSha,
        };
      }

      if (ci.status === "provider_error") {
        return {
          passed: false,
          reason: "CI_PROVIDER_ERROR",
          message: "Pre-push blocked: CI provider returned an error. Cannot determine remote CI safely.",
        };
      }

      if (["in_progress", "queued", "not_found"].includes(ci.status)) {
        pendingCount += 1;
      }
    }

    const inFlightCount = pendingCount + commits.length;
    if (inFlightCount > maxInFlightCommits) {
      return {
        passed: false,
        reason: "CI_PENDING_WINDOW_EXCEEDED",
        message: `Pre-push blocked: this push would create ${inFlightCount} commits in flight (maximum ${maxInFlightCommits}). Wait for CI to complete.`,
        pendingCount,
        inFlightCount,
        maxInFlightCommits,
      };
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
