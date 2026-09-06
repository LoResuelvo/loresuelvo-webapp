import {
  classifyFiles,
  isDeliveryControlPlanePath,
  normalizePath,
} from "./classify-files.mjs";
import { analyzeCucumberImpact } from "./impact-index.mjs";
import { findRepoRoot } from "./repo-root.mjs";

function policyGate(policy, gateId) {
  const gate = policy?.gates?.[gateId];
  if (!gate) throw new Error(`Delivery policy does not define gate ${gateId}`);
  return gate;
}

function substituteDisplay(display, parameters) {
  return display.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (match, key) => {
    const value = parameters[key];
    if (Array.isArray(value)) return value.join(", ");
    return value ? String(value) : match;
  });
}

function buildGate(policy, gateId, reasonCodes, parameters = {}, extraCheckIds = []) {
  const definition = policyGate(policy, gateId);
  const checkIds = [...new Set([...definition.checkIds, ...extraCheckIds])];
  const checks = checkIds.map((checkId) => {
    const check = policy.checkCatalog[checkId];
    if (!check) throw new Error(`Delivery policy does not define check ${checkId}`);
    return substituteDisplay(check.display, parameters);
  });

  return {
    id: gateId,
    reasonCodes,
    checkIds,
    checks,
    parameters,
    postPushChecks: definition.postPushChecks || [],
  };
}

function uniqueFeaturePaths(paths) {
  return [
    ...new Set(
      paths
        .filter(Boolean)
        .map(normalizePath)
        .filter((file) => file.endsWith(".feature"))
    ),
  ].sort();
}

function resolveFeatureScope({ featureFile, scopeFiles, snapshot }) {
  return uniqueFeaturePaths([
    featureFile,
    ...(scopeFiles || []),
    ...(snapshot?.stagedFiles || []),
    ...(snapshot?.recentUsFiles || []),
  ]);
}

function pushDiagnostic(diagnostics, code, message) {
  diagnostics.push({ code, message, retryable: false });
}

function initialStatus({ snapshot, diagnostics, policy }) {
  let status = "ready";
  const { limits } = policy;

  if (snapshot?.diffTooLarge) {
    status = "blocked";
    pushDiagnostic(
      diagnostics,
      "DIFF_TOO_LARGE",
      `Staged diff exceeds maximum allowed limit of ${limits.maxDiffSizeBytes} bytes`
    );
  }

  if (snapshot?.tooManyFiles) {
    status = "blocked";
    pushDiagnostic(
      diagnostics,
      "TOO_MANY_FILES",
      `Staged files count (${snapshot.stagedFiles.length}) exceeds maximum limit of ${limits.maxStagedFiles}`
    );
  }

  if ((snapshot?.unstagedConflicts || []).length > 0) {
    status = "blocked";
    pushDiagnostic(
      diagnostics,
      "UNSTAGED_CONFLICT",
      `Unstaged changes detected in already-staged files: ${snapshot.unstagedConflicts.join(", ")}`
    );
  }

  if (snapshot?.isContradictoryUsId) {
    if (status !== "blocked") status = "needs_input";
    pushDiagnostic(
      diagnostics,
      "CONTRADICTORY_US_ID",
      `Proposed US ID (${snapshot.proposedUsId}) contradicts recent commit history (${snapshot.primaryRecentUsId})`
    );
  }

  if ((snapshot?.unrelatedUnstaged || []).length > 0) {
    status = "blocked";
    pushDiagnostic(
      diagnostics,
      "DIRTY_WORKTREE_OUTSIDE_SNAPSHOT",
      `Working tree has ${snapshot.unrelatedUnstaged.length} unstaged modification(s) outside the staged snapshot`
    );
  }

  if ((snapshot?.untracked || []).length > 0) {
    status = "blocked";
    pushDiagnostic(
      diagnostics,
      "DIRTY_WORKTREE_OUTSIDE_SNAPSHOT",
      `Working tree has ${snapshot.untracked.length} untracked path(s) outside the staged snapshot`
    );
  }

  const dirtyControlPlane = [
    ...(snapshot?.unrelatedUnstaged || []),
    ...(snapshot?.untracked || []),
  ].filter((file) => isDeliveryControlPlanePath(file, policy));
  if (dirtyControlPlane.length > 0) {
    status = "blocked";
    pushDiagnostic(
      diagnostics,
      "DELIVERY_CONTROL_PLANE_DIRTY",
      `Unstaged delivery control-plane changes would make gate evidence ambiguous: ${dirtyControlPlane.join(", ")}`
    );
  }

  return status;
}

export function selectGate({
  intent = "prepare_commit",
  featureFile = "",
  scopeFiles = [],
  repairsSha = "",
  snapshot,
  policy,
  maintainability = { status: "not_applicable", signalCount: 0, signals: [] },
  cucumberImpact = null,
  repoRoot = null,
} = {}) {
  const diagnostics = [];
  const stagedFiles = snapshot?.stagedFiles || [];

  if (stagedFiles.length === 0) {
    return {
      gate: buildGate(policy, "NONE", ["NO_STAGED_CHANGES"]),
      status: "no_changes",
      diagnostics,
      impact: {
        gate: "NONE",
        reasonCodes: [],
        consumerCount: 0,
        affectedFeatures: 0,
        confidence: "high",
      },
    };
  }

  let status = initialStatus({ snapshot, diagnostics, policy });
  const classified = classifyFiles(stagedFiles, policy);
  let gate;

  const closesHighRiskScenario = intent === "close_scenario" && classified.hasGateCTrigger;
  if (intent === "repair_ci") {
    gate = buildGate(policy, "R", ["INTENT_REPAIR_CI"]);
    if (!repairsSha) {
      if (status !== "blocked") status = "needs_input";
      pushDiagnostic(
        diagnostics,
        "MISSING_REPAIRS_SHA",
        "intent 'repair_ci' requires repairsSha to be specified"
      );
    }
  } else if (intent === "close_batch" || intent === "close_us" || closesHighRiskScenario) {
    const scopeFeatures = resolveFeatureScope({ featureFile, scopeFiles, snapshot });
    const reasonCode = closesHighRiskScenario
      ? "INTENT_CLOSE_HIGH_RISK_SCENARIO"
      : intent === "close_batch"
        ? "INTENT_CLOSE_BATCH"
        : "INTENT_CLOSE_US";
    gate = buildGate(
      policy,
      "D",
      [reasonCode],
      { scopeFeatures }
    );
    if (scopeFeatures.length === 0 && status !== "blocked") {
      status = "needs_input";
      pushDiagnostic(
        diagnostics,
        "MISSING_SCOPE_FOR_GATE_D",
        "Gate D requires at least one feature path to verify that completed scope has no @wip tags"
      );
    }
  } else if (classified.hasGateCTrigger) {
    gate = buildGate(policy, "C", ["SHARED_OR_HIGH_RISK_CHANGES"]);
  } else if (intent === "close_scenario") {
    const featureCandidates = uniqueFeaturePaths([featureFile, ...stagedFiles]);
    const targetFeature = featureCandidates.length === 1 ? featureCandidates[0] : "";
    gate = buildGate(policy, "B", ["INTENT_CLOSE_SCENARIO_LOW_RISK"], {
      featureFile: targetFeature,
    });
    if (!targetFeature && status !== "blocked") {
      status = "needs_input";
      pushDiagnostic(
        diagnostics,
        featureCandidates.length > 1
          ? "AMBIGUOUS_FEATURE_FOR_GATE_B"
          : "MISSING_FEATURE_FOR_GATE_B",
        featureCandidates.length > 1
          ? `Gate B requires exactly one feature, but resolved ${featureCandidates.length}: ${featureCandidates.join(", ")}`
          : "Gate B requires exactly one feature path, inferred or explicitly declared"
      );
    }
  } else if (classified.hasOnlyGate0) {
    gate = buildGate(policy, "0", ["E2E_STEPS_OR_FEATURES_ONLY"]);
  } else if (classified.hasIsolatedProduction || classified.hasDeliveryTooling) {
    const extraCheckIds = [];
    const reasonCodes = [];
    if (classified.hasIsolatedProduction) reasonCodes.push("ISOLATED_PRODUCTION_CODE");
    if (classified.hasDeliveryTooling) {
      reasonCodes.push("DELIVERY_TOOLING_CHANGED");
      extraCheckIds.push("delivery_unit");
    }
    if (classified.hasGate0Trigger) reasonCodes.push("INCLUDES_E2E_STEPS_OR_SUPPORT");
    if (classified.hasGate0Trigger) extraCheckIds.push("typecheck_cucumber");
    gate = buildGate(policy, "A", reasonCodes, {}, extraCheckIds);
  } else if (classified.hasOnlyDocsOrConfig) {
    gate = buildGate(policy, "NONE", ["DOCS_CONFIG_TESTS_OR_STYLES_ONLY"]);
  } else if (classified.hasGate0Trigger) {
    gate = buildGate(policy, "0", ["E2E_STEPS_OR_FEATURES_INCLUDED"]);
  } else {
    gate = buildGate(policy, "NONE", ["NON_FUNCTIONAL_CHANGES"]);
  }

  // Cucumber impact analysis and elevation
  let impact = cucumberImpact;
  if (!impact && stagedFiles.length > 0) {
    try {
      const root = repoRoot || findRepoRoot();
      impact = analyzeCucumberImpact({ repoRoot: root, files: stagedFiles });
    } catch {
      impact = null;
    }
  }

  const effectiveImpact = impact || {
    gate: "NONE",
    reasonCodes: [],
    consumerCount: 0,
    affectedFeatures: 0,
    confidence: "high",
  };

  if (impact && impact.gate && impact.gate !== "NONE") {
    const currentPriority = policy.gates[gate.id]?.priority ?? 0;
    const impactPriority = policy.gates[impact.gate]?.priority ?? 0;

    if (impactPriority > currentPriority) {
      if (impact.gate === "B") {
        const targetFeature = impact.parameters?.featureFile || featureFile;
        gate = buildGate(policy, "B", impact.reasonCodes, { featureFile: targetFeature });
        if (!targetFeature && status !== "blocked") {
          status = "needs_input";
          pushDiagnostic(
            diagnostics,
            "MISSING_FEATURE_FOR_GATE_B",
            "Gate B requires exactly one feature path, inferred or explicitly declared"
          );
        }
      } else if (impact.gate === "C") {
        gate = buildGate(policy, "C", impact.reasonCodes, gate.parameters);
      } else if (impact.gate === "D") {
        gate = buildGate(policy, "D", impact.reasonCodes, gate.parameters);
      } else if (impact.gate === "0") {
        gate = buildGate(policy, "0", impact.reasonCodes);
      }
    } else if (impactPriority === currentPriority && impact.gate === gate.id) {
      if (impact.reasonCodes?.length > 0) {
        gate = buildGate(
          policy,
          gate.id,
          [...new Set([...impact.reasonCodes, ...gate.reasonCodes])],
          { ...gate.parameters, ...(impact.parameters || {}) }
        );
      }
    }
  }

  if (maintainability?.operationalDiagnostic) {
    status = "blocked";
  } else if (
    maintainability?.status === "review_required" ||
    (maintainability?.signalCount || 0) > 0
  ) {
    if (status === "ready") status = "review_required";
    pushDiagnostic(
      diagnostics,
      "MAINTAINABILITY_SIGNALS",
      `${maintainability.signalCount} maintainability signal(s) detected in changed code; review required before commit`
    );
  }

  return {
    gate,
    status,
    diagnostics: diagnostics.slice(0, policy.limits.maxDiagnostics),
    impact: effectiveImpact,
  };
}
