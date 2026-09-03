import { classifyFiles, normalizePath } from "./classify-files.mjs";

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

function isDeliveryControlPlane(file) {
  const normalized = normalizePath(file);
  return (
    normalized.startsWith("tools/delivery-mcp/") ||
    normalized.startsWith(".delivery/") ||
    normalized.startsWith(".githooks/") ||
    [
      "package.json",
      "package-lock.json",
      "Makefile",
      "cucumber.json",
      "tsconfig.cucumber.json",
      "tsconfig.json",
      "vitest.config.ts",
    ].includes(normalized)
  );
}

function initialStatus({ snapshot, diagnostics, limits }) {
  let status = "ready";

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
    pushDiagnostic(
      diagnostics,
      "UNSTAGED_CHANGES",
      `Working tree has ${snapshot.unrelatedUnstaged.length} unstaged modification(s) unrelated to staged files`
    );
  }

  if ((snapshot?.untracked || []).length > 0) {
    pushDiagnostic(
      diagnostics,
      "UNTRACKED_CHANGES",
      `Working tree has ${snapshot.untracked.length} untracked path(s); successful evidence will not be cached`
    );
  }

  const dirtyControlPlane = [
    ...(snapshot?.unrelatedUnstaged || []),
    ...(snapshot?.untracked || []),
  ].filter(isDeliveryControlPlane);
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
  snapshot,
  policy,
  maintainability = { status: "not_applicable", signalCount: 0, signals: [] },
} = {}) {
  const diagnostics = [];
  const stagedFiles = snapshot?.stagedFiles || [];

  if (stagedFiles.length === 0) {
    return {
      gate: buildGate(policy, "NONE", ["NO_STAGED_CHANGES"]),
      status: "no_changes",
      diagnostics,
    };
  }

  let status = initialStatus({ snapshot, diagnostics, limits: policy.limits });
  const classified = classifyFiles(stagedFiles);
  let gate;

  const closesHighRiskScenario = intent === "close_scenario" && classified.hasGateCTrigger;
  if (intent === "close_batch" || intent === "close_us" || closesHighRiskScenario) {
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
    const inferredFeatures = uniqueFeaturePaths(stagedFiles);
    const targetFeature = featureFile || (inferredFeatures.length === 1 ? inferredFeatures[0] : "");
    gate = buildGate(policy, "B", ["INTENT_CLOSE_SCENARIO_LOW_RISK"], {
      featureFile: targetFeature,
    });
    if (!targetFeature && status !== "blocked") {
      status = "needs_input";
      pushDiagnostic(
        diagnostics,
        "MISSING_FEATURE_FOR_GATE_B",
        "Gate B requires featureFile when a single staged feature cannot be inferred"
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
  };
}
