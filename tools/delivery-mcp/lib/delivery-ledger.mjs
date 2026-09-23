import { execFileSync } from "node:child_process";
import { findRepoRoot } from "./repo-root.mjs";
import { inspectCi, getCiProvider } from "./ci-provider.mjs";
import { loadDeliveryPolicy } from "./policy-loader.mjs";
import {
  writeJsonAtomic, getLastPreparedEvidence, listCommitEvidence,
  recordPreparedEvidenceCore, recordCommitEvidenceCore,
} from "./ledger-evidence.mjs";
import {
  saveRepairAuthorization, resolveRepairChain, matchesTarget,
  isCommitInRemote, getRepairAuthorization,
} from "./ledger-repairs.mjs";

// Compatibility façade: preserve public exports while only the cross-domain
// evidence/repair writes and CI-window orchestration remain here.
export {
  LEDGER_DIR, LEDGER_FILE, LAST_PREPARED_FILE, REPAIR_LOCKS_DIR,
  LEDGER_STATES, ledgerError, loadEvidenceRecord, getLastPreparedEvidence,
  verifyPreparedEvidence, consumePreparedEvidence, acquireRepairLock,
  acquireLedgerLock, getCommitEvidence, validateCommitEvidenceEntryShape,
  rebuildLedgerFromIndividualRecords, listCommitEvidence, getLedgerState,
  inspectLedgerState, queryCommitEvidence, verifyCommitEvidence,
  hasCommitEvidence,
} from "./ledger-evidence.mjs";
export {
  REPAIR_AUTH_DIR, REPAIR_AUDIT_DIR, REPAIR_AUTH_STATES,
  markRepairPushConsumed, isCommitInRemote, getRepairAuthorization,
  saveRepairAuthorization, abandonRepairAttempt, determineRepairCommitState,
  authorizeRepairPush, updateCommitRepairStatus, sortCommitsTopologically,
  validateRepairLineage, validateRepairCommit, resolveRepairChain, matchesTarget,
} from "./ledger-repairs.mjs";

export async function recordPreparedEvidence(options = {}) {
  const prepared = await recordPreparedEvidenceCore(options);
  if (prepared.repairsSha) {
    try {
      await saveRepairAuthorization({
        repoRoot: options.repoRoot,
        authorization: {
          targetSha: prepared.repairsSha,
          state: "prepared",
          commitSha: null,
          snapshotHash: prepared.snapshotHash,
          intent: prepared.intent,
          gateId: prepared.gateId,
          policyHash: prepared.policyHash,
          preparedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    } catch {
      // Best-effort, as in the pre-extraction flow.
    }
  }
  return prepared;
}

export async function recordCommitEvidence(options = {}) {
  const entry = await recordCommitEvidenceCore(options);
  if (entry.repairsSha && entry.verificationStatus !== "not_run") {
    try {
      await saveRepairAuthorization({
        repoRoot: options.repoRoot,
        authorization: {
          targetSha: entry.repairsSha,
          commitSha: entry.commitSha,
          state: entry.repairAuthState || "bound_to_commit",
          snapshotHash: entry.snapshotHash,
          intent: entry.intent,
          gateId: entry.gateId,
          policyHash: entry.policyHash,
          boundAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    } catch {
      // Best-effort, as in the pre-extraction flow.
    }
  }
  return entry;
}



function filterEntriesReachableFrom(root, entries, historyHeadSha = "HEAD") {
  try {
    const reachableShas = new Set(
      execFileSync("git", ["rev-list", historyHeadSha], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      })
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((sha) => sha.toLowerCase())
    );
    return entries.filter((entry) => reachableShas.has(String(entry.commitSha).toLowerCase()));
  } catch {
    // Keep the full ledger when Git cannot resolve the history anchor. This is
    // fail-closed: CI evaluation may block, but it never silently drops evidence.
    return entries;
  }
}

export async function getActiveCiIncidents({
  repoRoot,
  ciProvider = null,
  excludeShas = [],
  historyHeadSha = "HEAD",
} = {}) {
  const root = findRepoRoot(repoRoot);
  const ledgerEntries = await listCommitEvidence({ repoRoot: root });
  const rawEntries = filterEntriesReachableFrom(root, ledgerEntries, historyHeadSha);
  const excludeSet = new Set(
    Array.from(excludeShas || []).map((s) => String(s).trim().toLowerCase())
  );
  const entries = (rawEntries || []).filter(
    (e) =>
      !excludeSet.has(String(e.commitSha).trim().toLowerCase()) &&
      e.repairStatus !== "abandoned"
  );
  if (!entries || entries.length === 0) {
    const empty = [];
    empty.activeCiIncidents = empty;
    empty.allIncidents = [];
    return empty;
  }

  const repairResolution = await resolveRepairChain({ repoRoot: root, commits: entries, ciProvider });
  const supersededFailures = new Set(
    (repairResolution.supersededFailures || []).map((s) => s.toLowerCase())
  );
  // Only lineage-validated repairs are allowed to resolve an incident. A
  // repair receipt that merely exists in the ledger (even with green CI) is
  // untrusted until validateRepairLineage accepted its target, branch, US,
  // ancestry and Gate R evidence.
  const validatedRepairSet = new Set(
    (repairResolution.validatedRepairs || []).map((s) => s.toLowerCase())
  );
  const invalidRepairSet = new Set(
    (repairResolution.invalidRepairs || []).map((repair) => String(repair.repairSha).toLowerCase())
  );

  // Mark historical failures in completed user stories whose close_us commit passed CI as superseded
  for (const entry of entries || []) {
    if (entry.intent === "close_us" && entry.usId) {
      const closeSha = entry.commitSha.toLowerCase();
      let closeCi;
      try {
        closeCi = await inspectCi({ sha: closeSha, repoRoot: root, provider: ciProvider });
      } catch {
        closeCi = null;
      }
      if (closeCi?.status === "passed") {
        const usId = String(entry.usId).trim().toLowerCase();
        for (const candidate of entries || []) {
          if (
            candidate.usId &&
            String(candidate.usId).trim().toLowerCase() === usId &&
            candidate.commitSha.toLowerCase() !== closeSha
          ) {
            const candSha = candidate.commitSha.toLowerCase();
            let isAnc = false;
            try {
              execFileSync("git", ["merge-base", "--is-ancestor", candSha, closeSha], {
                cwd: root,
                stdio: ["ignore", "ignore", "ignore"],
              });
              isAnc = true;
            } catch {
              isAnc = false;
            }
            if (isAnc) {
              supersededFailures.add(candSha);
            }
          }
        }
      }
    }
  }

  const repairsByTarget = new Map();
  for (const entry of entries) {
    if (entry.repairsSha && !invalidRepairSet.has(entry.commitSha.toLowerCase())) {
      const rawTarget = String(entry.repairsSha).trim().toLowerCase();
      if (!repairsByTarget.has(rawTarget)) {
        repairsByTarget.set(rawTarget, []);
      }
      repairsByTarget.get(rawTarget).push(entry);
    }
  }

  function findRepairsForSha(sha) {
    const matching = [];
    for (const [targetKey, list] of repairsByTarget.entries()) {
      if (matchesTarget(targetKey, sha)) {
        matching.push(...list);
      }
    }
    return matching;
  }

  const allIncidents = [];
  const activeCiIncidents = [];

  for (const entry of entries) {
    const sha = entry.commitSha.toLowerCase();
    const usId = entry.usId || null;
    const branch = entry.branch || null;

    let status = "pending";
    let repairSha = null;

    if (supersededFailures.has(sha)) {
      status = "superseded";
    } else {
      let ci;
      try {
        ci = await inspectCi({ sha, repoRoot: root, provider: ciProvider });
      } catch (err) {
        throw err;
      }

      if (ci.status === "passed") {
        status = "passed";
      } else if (ci.status === "provider_error") {
        status = "provider_error";
      } else if (["in_progress", "queued", "not_found"].includes(ci.status)) {
        status = "pending";
      } else if (["failed", "cancelled", "timed_out"].includes(ci.status)) {
        const repairs = findRepairsForSha(sha);
        if (repairs.length > 0) {
          const latestRepair = repairs[repairs.length - 1];
          const rSha = latestRepair.commitSha.toLowerCase();
          repairSha = rSha;

          let rCi;
          try {
            rCi = await inspectCi({ sha: rSha, repoRoot: root, provider: ciProvider });
          } catch (err) {
            throw err;
          }

          if (rCi.status === "passed") {
            // A green receipt resolves the target only after the exact same
            // repair has passed lineage validation in resolveRepairChain.
            status = validatedRepairSet.has(rSha)
              ? (supersededFailures.has(sha) ? "superseded" : "passed")
              : "repair_submitted";
          } else if (["in_progress", "queued"].includes(rCi.status)) {
            status = "repair_submitted";
          } else if (["failed", "cancelled", "timed_out"].includes(rCi.status)) {
            status = "repair_failed";
          } else if (rCi.status === "provider_error") {
            status = "provider_error";
          } else {
            if (latestRepair.repairPushConsumed || isCommitInRemote(root, rSha)) {
              status = "repair_submitted";
            } else {
              status = "repair_prepared";
            }
          }
        } else {
          let auth = null;
          try {
            auth = await getRepairAuthorization({ repoRoot: root, targetSha: sha });
          } catch {
            auth = null;
          }
          let lastPrepared = null;
          try {
            lastPrepared = await getLastPreparedEvidence({ repoRoot: root });
          } catch {
            lastPrepared = null;
          }

          if (auth && (auth.state === "prepared" || auth.state === "bound_to_commit")) {
            status = "repair_prepared";
            repairSha = auth.commitSha || null;
          } else if (
            lastPrepared?.repairsSha &&
            matchesTarget(lastPrepared.repairsSha, sha) &&
            !lastPrepared.consumedByCommitSha &&
            lastPrepared.repairStatus !== "abandoned"
          ) {
            status = "repair_prepared";
            repairSha = null;
          } else {
            status = "repair_required";
            repairSha = null;
          }
        }
      }
    }

    const incidentRecord = {
      failedSha: sha,
      usId,
      branch,
      status,
      repairSha,
    };

    allIncidents.push(incidentRecord);

    if (["repair_required", "repair_failed", "repair_prepared", "repair_submitted"].includes(status)) {
      activeCiIncidents.push(incidentRecord);
    }
  }

  try {
    await writeJsonAtomic(root, ".delivery/runtime/active-incidents.json", {
      updatedAt: new Date().toISOString(),
      activeCiIncidents,
    });
  } catch {
    // best-effort
  }

  activeCiIncidents.activeCiIncidents = activeCiIncidents;
  activeCiIncidents.allIncidents = allIncidents;
  return activeCiIncidents;
}

export async function evaluateCiWindow({
  repoRoot,
  policy = null,
  ciProvider = null,
  targetSha = null,
  intent = "prepare_commit",
  repairsSha = null,
  excludeShas = [],
  commitCount = 0,
  historyHeadSha = "HEAD",
} = {}) {
  const root = findRepoRoot(repoRoot);
  const effectivePolicy = policy || (await loadDeliveryPolicy({ repoRoot: root }));
  const maxInFlightCommits = effectivePolicy?.ci?.maxInFlightCommits ?? 4;
  const effectiveProvider = ciProvider || getCiProvider();

  let rawEntries = [];
  try {
    rawEntries = await listCommitEvidence({ repoRoot: root });
  } catch (error) {
    if (
      error?.code === "LEDGER_CORRUPT" ||
      error?.code === "LEDGER_INCONSISTENT" ||
      error?.message?.includes("LEDGER_CORRUPT") ||
      error?.message?.includes("LEDGER_INCONSISTENT")
    ) {
      return {
        allowed: false,
        status: "blocked",
        reason: "LEDGER_CORRUPT",
        code: "LEDGER_CORRUPT",
        message: "Delivery ledger is corrupt and cannot be safely recovered.",
        retryable: false,
      };
    }
    throw error;
  }

  const excludeSet = new Set(
    Array.from(excludeShas || []).map((s) => String(s).trim().toLowerCase())
  );
  const historyEntries = filterEntriesReachableFrom(root, rawEntries || [], historyHeadSha);
  const relevantEntries = historyEntries.filter(
    (e) => !excludeSet.has(String(e.commitSha).trim().toLowerCase())
  );
  const priorShas = relevantEntries.map((e) => e.commitSha);

  let activeIncidents = [];
  let supersededSet = new Set();
  let repairResolution = null;
  try {
    repairResolution = await resolveRepairChain({
      repoRoot: root,
      commits: historyEntries,
      ciProvider: effectiveProvider,
    });
    supersededSet = new Set((repairResolution.supersededFailures || []).map((s) => s.toLowerCase()));
    activeIncidents = await getActiveCiIncidents({
      repoRoot: root,
      ciProvider: effectiveProvider,
      excludeShas: excludeSet,
      historyHeadSha,
    });
  } catch (error) {
    if (
      error?.code === "LEDGER_CORRUPT" ||
      error?.code === "LEDGER_INCONSISTENT" ||
      error?.message?.includes("LEDGER_CORRUPT") ||
      error?.message?.includes("LEDGER_INCONSISTENT")
    ) {
      return {
        allowed: false,
        status: "blocked",
        reason: "LEDGER_CORRUPT",
        code: "LEDGER_CORRUPT",
        message: "Delivery ledger is corrupt and cannot be safely recovered.",
        retryable: false,
      };
    }
    return {
      allowed: false,
      status: "blocked",
      reason: "CI_INSPECTION_FAILED",
      code: "CI_INSPECTION_FAILED",
      message: `Could not inspect remote CI: ${error.message}`,
      retryable: true,
    };
  }

  const providerErrorIncident =
    activeIncidents.find((inc) => inc.status === "provider_error") ||
    (activeIncidents.allIncidents &&
      activeIncidents.allIncidents.find((inc) => inc.status === "provider_error"));
  if (providerErrorIncident) {
    return {
      allowed: false,
      status: "blocked",
      reason: "CI_PROVIDER_ERROR",
      code: "CI_PROVIDER_ERROR",
      message: "CI provider returned an error. Cannot determine remote CI safely.",
      retryable: true,
    };
  }

  const unresolvedIncidents = activeIncidents.filter(
    (inc) =>
      ["repair_required", "repair_failed", "repair_prepared", "repair_submitted"].includes(inc.status) &&
      !supersededSet.has(inc.failedSha.toLowerCase())
  );

  const effectiveRepairsSha = repairsSha || targetSha || null;
  const isRepair = intent === "repair_ci" || Boolean(effectiveRepairsSha);

  if (unresolvedIncidents.length > 0) {
    const matchingIncident = isRepair && effectiveRepairsSha
      ? unresolvedIncidents.find((inc) => matchesTarget(effectiveRepairsSha, inc.failedSha))
      : null;

    if (isRepair && matchingIncident) {
      return {
        allowed: true,
        status: "passed",
        isRepair: true,
        matchingIncident,
        targetSha: matchingIncident.failedSha,
        activeIncident: matchingIncident,
        activeIncidents,
        unresolvedIncidents,
        supersededSet,
        repairResolution,
      };
    }

    if (isRepair && !matchingIncident && effectiveRepairsSha) {
      return {
        allowed: false,
        status: "blocked",
        reason: "REPAIR_TARGET_MISMATCH",
        code: "REPAIR_TARGET_MISMATCH",
        message: `repair_ci specified target ${effectiveRepairsSha.slice(0, 8)}, but active CI failure is on commit ${unresolvedIncidents[0].failedSha.slice(0, 8)}.`,
        failedSha: unresolvedIncidents[0].failedSha,
        sha: unresolvedIncidents[0].failedSha,
        activeIncident: unresolvedIncidents[0],
        unresolvedIncidents,
        retryable: false,
      };
    }

    const targetIncident = unresolvedIncidents[0];
    const failedSha = targetIncident.failedSha;
    return {
      allowed: false,
      status: "blocked",
      reason: "PRIOR_COMMIT_CI_FAILED",
      code: "REPAIR_REQUIRED",
      message: `Prior commit ${failedSha.slice(0, 8)} failed CI in GitHub Actions. Repair required before delivering new changes. Use intent: 'repair_ci' with repairsSha: '${failedSha}'.`,
      failedSha,
      sha: failedSha,
      activeIncident: targetIncident,
      unresolvedIncidents,
      retryable: false,
    };
  }

  // If local commit claims to be a repair but there are no active unresolved incidents:
  if (isRepair) {
    return {
      allowed: true,
      status: "passed",
      isRepair: true,
      matchingIncident: null,
      targetSha: effectiveRepairsSha,
      activeIncidents,
      unresolvedIncidents: [],
      supersededSet,
      repairResolution,
    };
  }

  // Step 2: Continuous window control for pending commits
  const recentPriorShas = priorShas.slice(-(maxInFlightCommits + 1)).reverse();
  let pendingCount = 0;

  const incidentsBySha = new Map();
  for (const inc of activeIncidents.allIncidents || []) {
    if (inc.failedSha) {
      incidentsBySha.set(inc.failedSha.toLowerCase(), inc);
    }
  }

  for (const priorSha of recentPriorShas) {
    const inc = incidentsBySha.get(priorSha.toLowerCase());
    if (inc) {
      if (inc.status === "provider_error") {
        return {
          allowed: false,
          status: "blocked",
          reason: "CI_PROVIDER_ERROR",
          code: "CI_PROVIDER_ERROR",
          message: "CI provider returned an error. Cannot determine remote CI safely.",
          retryable: true,
        };
      }
      if (inc.status === "pending") {
        pendingCount += 1;
      }
    } else {
      let ci;
      try {
        ci = await inspectCi({ sha: priorSha, repoRoot: root, provider: effectiveProvider });
      } catch {
        return {
          allowed: false,
          status: "blocked",
          reason: "CI_INSPECTION_FAILED",
          code: "CI_INSPECTION_FAILED",
          message: "Could not inspect remote CI.",
          retryable: true,
        };
      }
      if (ci.status === "provider_error") {
        return {
          allowed: false,
          status: "blocked",
          reason: "CI_PROVIDER_ERROR",
          code: "CI_PROVIDER_ERROR",
          message: "CI provider returned an error. Cannot determine remote CI safely.",
          retryable: true,
        };
      }
      if (["in_progress", "queued", "not_found"].includes(ci.status)) {
        pendingCount += 1;
      }
    }
  }

  const inFlightCount = pendingCount + commitCount;
  const isWindowFull = commitCount > 0 ? inFlightCount > maxInFlightCommits : pendingCount >= maxInFlightCommits;

  if (isWindowFull) {
    return {
      allowed: false,
      status: "blocked",
      reason: commitCount > 0 ? "CI_PENDING_WINDOW_EXCEEDED" : "CI_WINDOW_FULL",
      code: "CI_WINDOW_FULL",
      message: commitCount > 0
        ? `Pre-push blocked: this push would create ${inFlightCount} commits in flight (maximum ${maxInFlightCommits}). Wait for CI to complete.`
        : `CI window full: ${pendingCount} commits currently in flight (maximum ${maxInFlightCommits}). Wait for CI to complete before delivering new changes.`,
      pendingCount,
      inFlightCount: commitCount > 0 ? inFlightCount : pendingCount,
      maxInFlightCommits,
      activeIncidents,
      unresolvedIncidents: [],
      retryable: true,
    };
  }

  return {
    allowed: true,
    status: "passed",
    pendingCount,
    inFlightCount: commitCount > 0 ? inFlightCount : pendingCount,
    maxInFlightCommits,
    activeIncidents,
    unresolvedIncidents: [],
    supersededSet,
    repairResolution,
  };
}
