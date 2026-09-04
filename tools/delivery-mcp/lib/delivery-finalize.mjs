import { execFileSync } from "node:child_process";
import { findRepoRoot, assertSafeRepoPath } from "./repo-root.mjs";
import { queryCommitEvidence, verifyCommitEvidence } from "./delivery-ledger.mjs";
import { loadDeliveryContext } from "./delivery-context.mjs";
import { extractUsId } from "./git-snapshot.mjs";
import { inspectCi } from "./ci-provider.mjs";

function normalizeUsId(usId) {
  if (!usId || typeof usId !== "string") return null;
  return usId.trim().toUpperCase().replace(/^US[-_]?/i, "");
}

function samePaths(left = [], right = []) {
  const normalizedLeft = [...new Set(left)].sort();
  const normalizedRight = [...new Set(right)].sort();
  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
}

function relevantCommitShas(root, headSha, usId) {
  const normalizedUsId = normalizeUsId(usId);
  if (!normalizedUsId) return [headSha];

  const output = execFileSync("git", ["log", "-n", "200", "--format=%H%x00%s%x00", headSha], {
    cwd: root,
    encoding: "buffer",
  });
  const fields = output.toString("utf8").split("\0").filter(Boolean);
  const matches = [];
  for (let index = 0; index + 1 < fields.length; index += 2) {
    const sha = fields[index].trim();
    const subject = fields[index + 1].trim();
    if (normalizeUsId(extractUsId(subject)) === normalizedUsId) matches.push(sha);
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
  const context = await loadDeliveryContext({ repoRoot: root });

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

  const evidenceScope = evidenceRecord.gate?.parameters?.scopeFeatures || [];
  const requestedScope = [...new Set([...(scopeFiles || []), ...(context?.scopeFiles || [])])];
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

  const effectiveUsId = usId || context?.usId || verifiedHead.entry.usId || null;
  const shas = relevantCommitShas(root, headSha, effectiveUsId);
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
      };
    }
    if (evidence.state === "corrupt") {
      return {
        finalized: false,
        status: "blocked",
        reason: "CORRUPT_COMMIT_EVIDENCE",
        message: `Commit ${sha.slice(0, 8)} has corrupt delivery evidence (${evidence.reason})`,
        sha,
      };
    }
    if (evidence.state === "not_run") {
      unverifiedCommits.push(sha);
    }
  }

  const ciResults = [];
  for (const sha of shas) {
    const ci = await inspectCi({ sha, repoRoot: root, provider: ciProvider });
    ciResults.push(ci);
    if (ci.status !== "passed") {
      const pending = ci.status === "in_progress" || ci.status === "queued";
      return {
        finalized: false,
        status: pending ? "in_progress" : "blocked",
        reason: pending ? "CI_IN_PROGRESS" : "CI_NOT_GREEN",
        message: `CI for commit ${sha.slice(0, 8)} is '${ci.status}'${ci.failure?.message ? `: ${ci.failure.message}` : ""}`,
        sha,
        ci,
      };
    }
  }

  return {
    finalized: true,
    status: "passed",
    intent,
    usId: effectiveUsId,
    headSha,
    shas,
    unverifiedCommits,
    message: `Delivery ${effectiveUsId ? `'${effectiveUsId}' ` : ""}finalized with Gate D and green CI`,
    ci: ciResults,
  };
}
