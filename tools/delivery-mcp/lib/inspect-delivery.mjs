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

export async function inspectDelivery({
  repoRoot,
  intent = "prepare_commit",
  proposedCommitMessage = "",
  featureFile = "",
  scenarioName = "",
  scopeFiles = [],
} = {}) {
  const root = findRepoRoot(repoRoot);
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
      if (intent === "prepare_commit" && activeContext.intent) {
        effectiveIntent = activeContext.intent;
      }
      effectiveFeatureFile = effectiveFeatureFile || activeContext.featureFile || "";
      effectiveScenarioName = effectiveScenarioName || activeContext.scenarioName || "";
      if (effectiveScopeFiles.length === 0 && activeContext.scopeFiles?.length > 0) {
        effectiveScopeFiles = [...activeContext.scopeFiles];
      }
    }
  }

  // Safe inference: removing @wip from a single staged scenario can suggest close_scenario
  if (effectiveIntent === "prepare_commit" && !effectiveFeatureFile) {
    const inferred = inferWipRemovalScenario(snapshot.stagedDiffText, snapshot.stagedFiles);
    if (inferred) {
      effectiveIntent = inferred.intent;
      effectiveFeatureFile = inferred.featureFile;
    }
  }

  const maintainability = await runMaintainabilityAudit({
    stagedFiles: snapshot.stagedFiles,
    repoRoot: root,
  });

  const gateResult = selectGate({
    intent: effectiveIntent,
    featureFile: effectiveFeatureFile,
    scenarioName: effectiveScenarioName,
    scopeFiles: effectiveScopeFiles,
    snapshot,
    policy,
    maintainability,
  });

  if (contextDiagnostics.length > 0) {
    if (gateResult.status !== "blocked") {
      gateResult.status = "needs_input";
    }
    gateResult.diagnostics = [...contextDiagnostics, ...gateResult.diagnostics];
  }

  const result = formatInspectionResult({
    snapshot,
    gateResult,
    maintainability,
    policy,
    repoRoot: root,
  });

  return { result, snapshot, policy, context: activeContext };
}
