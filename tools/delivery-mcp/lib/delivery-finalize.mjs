import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { findRepoRoot, assertSafeRepoPath } from "./repo-root.mjs";
import { getCommitEvidence, getLastPreparedEvidence } from "./delivery-ledger.mjs";
import { loadDeliveryContext } from "./delivery-context.mjs";
import { inspectCi } from "./ci-provider.mjs";

export async function finalizeDelivery({
  repoRoot,
  intent = "close_us",
  usId = null,
  scopeFiles = [],
  ciProvider = null,
} = {}) {
  const root = findRepoRoot(repoRoot);

  // 1. Resolve active context if available
  const context = await loadDeliveryContext({ repoRoot: root });
  const effectiveUsId = usId || context?.usId || null;
  const effectiveScope = [
    ...new Set([...(scopeFiles || []), ...(context?.scopeFiles || [])]),
  ];

  // 2. Resolve current HEAD commit
  let headSha = "";
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
      message: `Failed to resolve HEAD commit: ${error.message}`,
    };
  }

  // 3. Comprueba Gate D local asociado en el ledger
  const evidence = await getCommitEvidence({ repoRoot: root, commitSha: headSha });
  const prepared = await getLastPreparedEvidence({ repoRoot: root });

  let evidenceRecord = null;
  const targetRecordPath = evidence?.recordPath || prepared?.recordPath;
  if (targetRecordPath) {
    try {
      const raw = await fs.readFile(path.resolve(root, targetRecordPath), "utf8");
      evidenceRecord = JSON.parse(raw);
    } catch {
      // ignore
    }
  }

  const gateId = evidenceRecord?.gate?.id;
  const gateStatus = evidenceRecord?.status || prepared?.status;

  if (gateId !== "D" || gateStatus !== "passed") {
    return {
      finalized: false,
      status: "blocked",
      reason: "GATE_D_REQUIRED",
      message: `Finalizing US closure requires prior Gate D evidence passed locally. Observed gate: '${gateId || "NONE"}', status: '${gateStatus || "none"}'`,
    };
  }

  // 4. Comprueba ausencia de @wip en el alcance de features
  const featuresToCheck = effectiveScope.filter((f) => f.endsWith(".feature"));
  const wipViolations = [];

  for (const feature of featuresToCheck) {
    assertSafeRepoPath(root, feature, "Scope feature");
    try {
      const content = await fs.readFile(path.resolve(root, feature), "utf8");
      const lines = content.split(/\r?\n/);
      lines.forEach((line, idx) => {
        if (/(?:^|\s)@wip(?:\s|$)/.test(line)) {
          wipViolations.push(`${feature}:${idx + 1}`);
        }
      });
    } catch {
      // file might have been deleted or moved
    }
  }

  if (wipViolations.length > 0) {
    return {
      finalized: false,
      status: "blocked",
      reason: "WIP_IN_SCOPE",
      message: `Cannot finalize US: remaining @wip tags found in completed scope: ${wipViolations.join(", ")}`,
      locations: wipViolations,
    };
  }

  // 5. Comprueba commits del alcance pusheados
  let unpushedCommits = [];
  try {
    const unpushed = execFileSync("git", ["log", "@{u}..HEAD", "--oneline"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    if (unpushed) {
      unpushedCommits = unpushed.split("\n");
    }
  } catch {
    // If no upstream configured or offline, try checking against origin/main
    try {
      const unpushedOrigin = execFileSync("git", ["log", "origin/main..HEAD", "--oneline"], {
        cwd: root,
        encoding: "utf8",
      }).trim();
      if (unpushedOrigin) {
        unpushedCommits = unpushedOrigin.split("\n");
      }
    } catch {
      // No remote tracking branch found; allow in isolated test environments
    }
  }

  if (unpushedCommits.length > 0 && process.env.DELIVERY_ALLOW_UNPUSHED_FINALIZE !== "1") {
    return {
      finalized: false,
      status: "blocked",
      reason: "UNPUSHED_COMMITS",
      message: `Cannot finalize US: there are unpushed commits on HEAD: ${unpushedCommits.slice(0, 3).join("; ")}`,
    };
  }

  // 6. Comprueba CI verde de los SHAs relevantes
  const ciResult = await inspectCi({ sha: headSha, repoRoot: root, provider: ciProvider });

  if (ciResult.status === "in_progress" || ciResult.status === "queued") {
    return {
      finalized: false,
      status: "in_progress",
      reason: "CI_IN_PROGRESS",
      message: `CI is still in progress for commit ${headSha.slice(0, 8)} (${ciResult.status})`,
      ci: ciResult,
    };
  }

  if (ciResult.status === "failed" || ciResult.status === "timed_out") {
    return {
      finalized: false,
      status: "failed",
      reason: "CI_FAILED",
      message: `CI failed for commit ${headSha.slice(0, 8)}: ${ciResult.failure?.message || "Check GitHub Actions"}`,
      ci: ciResult,
    };
  }

  return {
    finalized: true,
    status: "passed",
    usId: effectiveUsId,
    headSha,
    message: `User Story ${effectiveUsId ? `'${effectiveUsId}' ` : ""}successfully finalized with Gate D, clean scope, and green CI`,
    ci: ciResult,
  };
}
