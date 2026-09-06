import { captureGitSnapshot } from "./git-snapshot.mjs";
import { selectGate } from "./select-gate.mjs";
import { runMaintainabilityAudit } from "./run-maintainability.mjs";
import { formatInspectionResult } from "./format-result.mjs";
import { loadDeliveryPolicy } from "./policy-loader.mjs";
import { findRepoRoot } from "./repo-root.mjs";
import {
  loadDeliveryContext,
  validateDeliveryContext,
  inferWipRemovalScenario,
} from "./delivery-context.mjs";
import { inspectCi } from "./ci-provider.mjs";
import { listCommitEvidence } from "./delivery-ledger.mjs";

export async function inspectDelivery({
  repoRoot,
  intent = "prepare_commit",
  proposedCommitMessage = "",
  featureFile = "",
  scenarioName = "",
  scopeFiles = [],
  repairsSha = null,
  provider = null,
  ciProvider = null,
} = {}) {
  const root = findRepoRoot(repoRoot);
  const effectiveProvider = provider || ciProvider || null;
  const policy = await loadDeliveryPolicy({ repoRoot: root });
  const snapshot = await captureGitSnapshot({
    cwd: root,
    proposedCommitMessage,
    limits: policy.limits,
  });

  let effectiveIntent = intent;
  let effectiveFeatureFile = featureFile;
  let effectiveScenarioName = scenarioName;
  let effectiveScopeFiles = [...scopeFiles];
  let effectiveUsId = snapshot.proposedUsId || null;
  let effectiveRepairsSha = repairsSha ? String(repairsSha).trim() : null;
  const contextDiagnostics = [];

  const activeContext = await loadDeliveryContext({ repoRoot: root });
  if (activeContext) {
    const validation = validateDeliveryContext({
      context: activeContext,
      snapshot,
      proposedCommitMessage,
    });

    if (validation.conflict) {
      contextDiagnostics.push({
        code: "CONTEXT_US_CONFLICT",
        message: validation.message,
        retryable: false,
      });
    } else if (validation.valid) {
      effectiveUsId = activeContext.usId || effectiveUsId;
      if (intent === "prepare_commit" && activeContext.intent) {
        effectiveIntent = activeContext.intent;
      }
      effectiveFeatureFile = effectiveFeatureFile || activeContext.featureFile || "";
      effectiveScenarioName = effectiveScenarioName || activeContext.scenarioName || "";
      if (effectiveScopeFiles.length === 0 && activeContext.scopeFiles?.length > 0) {
        effectiveScopeFiles = [...activeContext.scopeFiles];
      }
      effectiveRepairsSha = effectiveRepairsSha || activeContext.repairsSha || null;
    }
  }

  // Safe inference: removing @wip from a single staged scenario can suggest close_scenario
  if (effectiveIntent === "prepare_commit" && !effectiveFeatureFile) {
    const inferred = inferWipRemovalScenario(snapshot.stagedDiffText, snapshot.stagedFiles);
    if (inferred) {
      effectiveIntent = inferred.intent;
      effectiveFeatureFile = inferred.featureFile;
      effectiveScenarioName = inferred.scenarioName || effectiveScenarioName;
    }
  }

  const maintainability = await runMaintainabilityAudit({
    stagedFiles: snapshot.stagedFiles,
    repoRoot: root,
    maxSignals: policy.limits.maxSignals,
  });

  const gateResult = selectGate({
    intent: effectiveIntent,
    featureFile: effectiveFeatureFile,
    scenarioName: effectiveScenarioName,
    scopeFiles: effectiveScopeFiles,
    repairsSha: effectiveRepairsSha,
    snapshot,
    policy,
    maintainability,
  });

  if (effectiveIntent === "repair_ci" && effectiveRepairsSha) {
    if (!/^[a-f0-9]{7,40}$/i.test(effectiveRepairsSha)) {
      gateResult.status = "blocked";
      gateResult.diagnostics.push({
        code: "INVALID_REPAIRS_SHA",
        message: `Invalid repairsSha format: ${effectiveRepairsSha}. Expected 7-40 hex characters.`,
        retryable: false,
      });
    } else {
      let ledgerEntries = [];
      try {
        ledgerEntries = await listCommitEvidence({ repoRoot: root });
      } catch {
        ledgerEntries = [];
      }
      const targetSha = effectiveRepairsSha.toLowerCase();
      const alreadyRepaired = ledgerEntries.some((entry) => {
        if (!entry.repairsSha) return false;
        const entryRepairs = String(entry.repairsSha).toLowerCase();
        return (
          entryRepairs === targetSha ||
          entryRepairs.startsWith(targetSha) ||
          targetSha.startsWith(entryRepairs)
        );
      });
      if (alreadyRepaired) {
        gateResult.status = "blocked";
        gateResult.diagnostics.push({
          code: "ALREADY_REPAIRED",
          message: `Commit ${effectiveRepairsSha.slice(0, 8)} has already been repaired or superseded in the ledger`,
          retryable: false,
        });
      } else {
        try {
          const ci = await inspectCi({ sha: effectiveRepairsSha, repoRoot: root, provider: effectiveProvider });
          if (ci.status === "passed") {
            gateResult.status = "blocked";
            gateResult.diagnostics.push({
              code: "REPAIR_TARGET_CI_PASSED",
              message: "Cannot repair a commit whose CI has passed",
              retryable: false,
            });
          } else if (ci.status === "provider_error") {
            gateResult.status = "blocked";
            gateResult.diagnostics.push({
              code: "CI_PROVIDER_ERROR",
              message: "CI provider error blocks repair validation",
              retryable: false,
            });
          } else if (!["failed", "cancelled", "timed_out"].includes(ci.status)) {
            gateResult.status = "blocked";
            gateResult.diagnostics.push({
              code: "REPAIR_TARGET_CI_NOT_FAILED",
              message: `Cannot repair a commit with CI status '${ci.status}'. Status must be failed, cancelled, or timed_out`,
              retryable: false,
            });
          }
        } catch (err) {
          gateResult.status = "blocked";
          gateResult.diagnostics.push({
            code: "CI_PROVIDER_ERROR",
            message: `CI provider error blocks repair validation: ${err.message}`,
            retryable: false,
          });
        }
      }
    }
  }

  if (contextDiagnostics.length > 0) {
    if (gateResult.status !== "blocked") {
      gateResult.status = "needs_input";
    }
    gateResult.diagnostics = [...contextDiagnostics, ...gateResult.diagnostics];
  }
  gateResult.diagnostics = gateResult.diagnostics.slice(0, policy.limits.maxDiagnostics);

  const result = formatInspectionResult({
    snapshot,
    gateResult,
    maintainability,
    policy,
    repoRoot: root,
  });

  return {
    result,
    snapshot,
    policy,
    context: activeContext,
    resolvedInput: {
      intent: effectiveIntent,
      featureFile: effectiveFeatureFile,
      scenarioName: effectiveScenarioName,
      scopeFiles: effectiveScopeFiles,
      usId: effectiveUsId,
      repairsSha: effectiveRepairsSha,
    },
  };
}
