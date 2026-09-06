import { execFileSync } from "node:child_process";
import { findRepoRoot, assertSafeRepoPath } from "./repo-root.mjs";
import { queryCommitEvidence, verifyCommitEvidence, resolveRepairChain, getCommitEvidence } from "./delivery-ledger.mjs";
import { extractUsId } from "./git-snapshot.mjs";
import { inspectCi } from "./ci-provider.mjs";
import { loadDeliveryPolicy } from "./policy-loader.mjs";

const BATCH_PENDING_CI_STATUSES = new Set(["queued", "in_progress", "not_found"]);

function normalizeUsId(usId) {
  if (!usId || typeof usId !== "string") return null;
  return usId.trim().toUpperCase().replace(/^US[-_]?/i, "");
}

function samePaths(left = [], right = []) {
  const normalizedLeft = [...new Set(left)].sort();
  const normalizedRight = [...new Set(right)].sort();
  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
}

async function relevantCommitShas(root, headSha, usId) {
  const normalizedUsId = normalizeUsId(usId);
  if (!normalizedUsId) return [headSha];

  const output = execFileSync("git", ["log", "-n", "200", "--format=%H%x00%s%x00", headSha], {
    cwd: root,
    encoding: "buffer",
  });
  const fields = output.toString("utf8").split("\0").filter(Boolean);
  const matches = [];
  const logShas = [];
  for (let index = 0; index + 1 < fields.length; index += 2) {
    const sha = fields[index].trim();
    const subject = fields[index + 1].trim();
    logShas.push(sha);
    if (normalizeUsId(extractUsId(subject)) === normalizedUsId) matches.push(sha);
  }

  for (const sha of logShas) {
    if (matches.includes(sha)) continue;
    try {
      const entry = await getCommitEvidence({ repoRoot: root, commitSha: sha });
      if (entry && normalizeUsId(entry.usId) === normalizedUsId) {
        matches.push(sha);
      }
    } catch {
      // ignore
    }
  }

  const toCheck = [...matches];
  while (toCheck.length > 0) {
    const currentSha = toCheck.pop();
    try {
      const entry = await getCommitEvidence({ repoRoot: root, commitSha: currentSha });
      if (entry?.repairsSha) {
        const target = entry.repairsSha.toLowerCase();
        if (!matches.includes(target) && logShas.map((s) => s.toLowerCase()).includes(target)) {
          matches.push(target);
          toCheck.push(target);
        }
      }
    } catch {
      // ignore
    }
  }

  if (!matches.includes(headSha)) matches.unshift(headSha);
  return [...new Set(matches)];
}

function readCommittedFeature(root, headSha, featurePath) {
  assertSafeRepoPath(root, featurePath, "Scope feature");
  return execFileSync("git", ["show", `${headSha}:${featurePath}`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 5 * 1024 * 1024,
  });
}

export async function finalizeDelivery({
  repoRoot,
  intent = "close_us",
  usId = null,
  scopeFiles = [],
  ciProvider = null,
} = {}) {
  const root = findRepoRoot(repoRoot);
  const policy = await loadDeliveryPolicy({ repoRoot: root });

  let headSha;
  try {
    headSha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch (error) {
    return {
      finalized: false,
      status: "blocked",
      reason: "GIT_ERROR",
      message: `Failed to resolve HEAD commit: ${String(error.message || "unknown").split("\n")[0]}`,
    };
  }

  const verifiedHead = await verifyCommitEvidence({ repoRoot: root, commitSha: headSha });
  if (!verifiedHead.valid) {
    return {
      finalized: false,
      status: "blocked",
      reason: "INVALID_HEAD_EVIDENCE",
      message: `Finalizing requires exact local evidence for HEAD (${verifiedHead.reason})`,
    };
  }

  const evidenceRecord = verifiedHead.record;
  if (evidenceRecord.gate?.id !== "D" || evidenceRecord.status !== "passed") {
    return {
      finalized: false,
      status: "blocked",
      reason: "GATE_D_REQUIRED",
      message: `Finalizing requires passed Gate D evidence on HEAD; observed '${evidenceRecord.gate?.id || "NONE"}'`,
    };
  }
  if (verifiedHead.entry.intent !== intent) {
    return {
      finalized: false,
      status: "blocked",
      reason: "INTENT_EVIDENCE_MISMATCH",
      message: `Finalizing '${intent}' requires matching HEAD evidence; observed '${verifiedHead.entry.intent || "none"}'`,
    };
  }

  const evidenceScope = evidenceRecord.gate?.parameters?.scopeFeatures || [];
  const requestedScope = [...new Set(scopeFiles || [])];
  if (evidenceScope.length === 0) {
    return {
      finalized: false,
      status: "blocked",
      reason: "MISSING_GATE_D_SCOPE",
      message: "Gate D evidence does not contain a completed feature scope",
    };
  }
  if (requestedScope.length > 0 && !samePaths(requestedScope, evidenceScope)) {
    return {
      finalized: false,
      status: "blocked",
      reason: "SCOPE_EVIDENCE_MISMATCH",
      message: "Requested closure scope does not match the scope verified by Gate D",
    };
  }

  const wipViolations = [];
  for (const feature of evidenceScope) {
    let content;
    try {
      content = readCommittedFeature(root, headSha, feature);
    } catch {
      return {
        finalized: false,
        status: "blocked",
        reason: "SCOPE_FILE_MISSING",
        message: `Committed feature scope file is unavailable at HEAD: ${feature}`,
      };
    }
    content.split(/\r?\n/).forEach((line, index) => {
      if (/(?:^|\s)@wip(?:\s|$)/.test(line)) wipViolations.push(`${feature}:${index + 1}`);
    });
  }

  if (wipViolations.length > 0) {
    return {
      finalized: false,
      status: "blocked",
      reason: "WIP_IN_SCOPE",
      message: `Cannot finalize: @wip remains in committed scope at ${wipViolations.slice(0, 6).join(", ")}`,
      locations: wipViolations.slice(0, 20),
    };
  }

  let unpushedCommits = [];
  try {
    const unpushed = execFileSync("git", ["log", "@{u}..HEAD", "--oneline"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    if (unpushed) unpushedCommits = unpushed.split("\n");
  } catch {
    try {
      const unpushed = execFileSync("git", ["log", "origin/main..HEAD", "--oneline"], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
      if (unpushed) unpushedCommits = unpushed.split("\n");
    } catch {
      // Isolated repositories can opt in through DELIVERY_ALLOW_UNPUSHED_FINALIZE.
    }
  }
  if (unpushedCommits.length > 0 && process.env.DELIVERY_ALLOW_UNPUSHED_FINALIZE !== "1") {
    return {
      finalized: false,
      status: "blocked",
      reason: "UNPUSHED_COMMITS",
      message: `Cannot finalize: unpushed commits include ${unpushedCommits.slice(0, 3).join("; ")}`,
    };
  }

  const requestedUsId = normalizeUsId(usId);
  const evidenceUsId = normalizeUsId(verifiedHead.entry.usId);
  if (requestedUsId && evidenceUsId && requestedUsId !== evidenceUsId) {
    return {
      finalized: false,
      status: "blocked",
      reason: "US_EVIDENCE_MISMATCH",
      message: `Requested User Story '${requestedUsId}' does not match HEAD evidence '${evidenceUsId}'`,
    };
  }

  const effectiveUsId = requestedUsId || evidenceUsId || null;
  const shas = await relevantCommitShas(root, headSha, effectiveUsId);
  const unverifiedCommits = [];
  for (const sha of shas) {
    const evidence = await queryCommitEvidence({ repoRoot: root, commitSha: sha });
    if (evidence.state === "missing") {
      return {
        finalized: false,
        status: "blocked",
        reason: "MISSING_COMMIT_EVIDENCE",
        message: `Commit ${sha.slice(0, 8)} lacks delivery ledger entry`,
        sha,
        supersededFailures: [],
        pendingFailures: [],
        failedRepairs: [],
        invalidRepairs: [],
      };
    }
    if (evidence.state === "corrupt") {
      return {
        finalized: false,
        status: "blocked",
        reason: "CORRUPT_COMMIT_EVIDENCE",
        message: `Commit ${sha.slice(0, 8)} has corrupt delivery evidence (${evidence.reason})`,
        sha,
        supersededFailures: [],
        pendingFailures: [],
        failedRepairs: [],
        invalidRepairs: [],
      };
    }
    if (evidence.state === "not_run") {
      unverifiedCommits.push(sha);
    }
  }

  const repairResolution = await resolveRepairChain({
    repoRoot: root,
    commits: shas,
    ciProvider,
  });
  const supersededFailures = repairResolution.supersededFailures || [];
  const failedRepairs = repairResolution.failedRepairs || [];
  const invalidRepairs = repairResolution.invalidRepairs || [];
  const supersededSet = new Set(supersededFailures.map((s) => s.toLowerCase()));

  const ciResults = [];
  const pendingCi = [];
  const pendingFailures = [];

  for (const sha of shas) {
    const ci = await inspectCi({ sha, repoRoot: root, provider: ciProvider });
    ciResults.push(ci);
    const normalizedSha = sha.toLowerCase();

    if (ci.status !== "passed") {
      if (supersededSet.has(normalizedSha)) {
        // Historical failure formally superseded by a green repair commit; does not block
        continue;
      }

      const pending = ci.status === "in_progress" || ci.status === "queued";
      if (intent === "close_batch" && BATCH_PENDING_CI_STATUSES.has(ci.status)) {
        pendingCi.push(ci);
        continue;
      }

      pendingFailures.push(sha);
    }
  }

  if (pendingFailures.length > 0) {
    const firstFailedSha = pendingFailures[0];
    const firstFailedCi = ciResults.find((c) => c.sha.toLowerCase() === firstFailedSha.toLowerCase());
    const isPending = firstFailedCi && (firstFailedCi.status === "in_progress" || firstFailedCi.status === "queued");

    return {
      finalized: false,
      status: isPending ? "in_progress" : "blocked",
      reason: isPending ? "CI_IN_PROGRESS" : "CI_NOT_GREEN",
      message: `CI for commit ${firstFailedSha.slice(0, 8)} is '${firstFailedCi?.status || "failed"}'${firstFailedCi?.failure?.message ? `: ${firstFailedCi.failure.message}` : ""}`,
      sha: firstFailedSha,
      ci: firstFailedCi,
      supersededFailures,
      pendingFailures,
      failedRepairs,
      invalidRepairs,
    };
  }

  if (invalidRepairs.length > 0) {
    return {
      finalized: false,
      status: "blocked",
      reason: "INVALID_REPAIRS",
      message: `Cannot finalize: observed ${invalidRepairs.length} invalid repair relation(s)`,
      supersededFailures,
      pendingFailures,
      failedRepairs,
      invalidRepairs,
    };
  }

  if (intent === "close_batch" && pendingCi.length > policy.ci.maxInFlightCommits) {
    return {
      finalized: false,
      status: "blocked",
      reason: "CI_PENDING_WINDOW_EXCEEDED",
      message: `Cannot close batch: ${pendingCi.length} commits remain in flight (maximum ${policy.ci.maxInFlightCommits})`,
      pendingCi,
      maxInFlightCommits: policy.ci.maxInFlightCommits,
      supersededFailures,
      pendingFailures,
      failedRepairs,
      invalidRepairs,
    };
  }

  const hasPendingCi = pendingCi.length > 0;
  const deliveryLabel = intent === "close_batch" ? "Batch" : "User Story";

  return {
    finalized: true,
    status: hasPendingCi ? "passed_pending_ci" : "passed",
    intent,
    usId: effectiveUsId,
    headSha,
    shas,
    unverifiedCommits,
    remoteVerification: hasPendingCi ? "pending" : "passed",
    pendingCi,
    maxInFlightCommits: policy.ci.maxInFlightCommits,
    message: hasPendingCi
      ? `${deliveryLabel} ${effectiveUsId ? `'${effectiveUsId}' ` : ""}closed locally with Gate D; ${pendingCi.length} CI run(s) remain pending`
      : `${deliveryLabel} ${effectiveUsId ? `'${effectiveUsId}' ` : ""}finalized with Gate D and green CI`,
    ci: ciResults,
    supersededFailures,
    pendingFailures,
    failedRepairs,
    invalidRepairs,
  };
}

export { verifyHeadDelivery } from "./verify-head.mjs";
