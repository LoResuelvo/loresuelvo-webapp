import { captureGitSnapshot } from "./git-snapshot.mjs";
import { selectGate } from "./select-gate.mjs";
import { runMaintainabilityAudit } from "./run-maintainability.mjs";
import { formatInspectionResult } from "./format-result.mjs";
import { loadDeliveryPolicy } from "./policy-loader.mjs";
import { findRepoRoot } from "./repo-root.mjs";

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
  const maintainability = await runMaintainabilityAudit({
    stagedFiles: snapshot.stagedFiles,
    repoRoot: root,
  });
  const gateResult = selectGate({
    intent,
    featureFile,
    scenarioName,
    scopeFiles,
    snapshot,
    policy,
    maintainability,
  });
  const result = formatInspectionResult({
    snapshot,
    gateResult,
    maintainability,
    policy,
    repoRoot: root,
  });

  return { result, snapshot, policy };
}
