import { classifyFiles } from "./classify-files.mjs";

export function selectGate({
  intent = "prepare_commit",
  proposedCommitMessage = "",
  featureFile = "",
  scenarioName = "",
  snapshot,
  maintainability = { status: "not_applicable", signalCount: 0, signals: [] },
} = {}) {
  const diagnostics = [];
  const stagedFiles = snapshot?.stagedFiles || [];
  const unstagedConflicts = snapshot?.unstagedConflicts || [];
  const unrelatedUnstaged = snapshot?.unrelatedUnstaged || [];
  const isContradictoryUsId = snapshot?.isContradictoryUsId || false;
  const diffTooLarge = snapshot?.diffTooLarge || false;
  const tooManyFiles = snapshot?.tooManyFiles || false;

  // Rule 1: No staged changes
  if (stagedFiles.length === 0) {
    return {
      gate: {
        id: "NONE",
        reasonCodes: ["NO_STAGED_CHANGES"],
        checks: [],
      },
      status: "no_changes",
      diagnostics,
    };
  }

  // Diagnostics & Status determination
  let status = "ready";

  if (diffTooLarge) {
    status = "blocked";
    diagnostics.push({
      code: "DIFF_TOO_LARGE",
      message: "Staged diff exceeds maximum allowed limit of 2 MB",
      retryable: false,
    });
  }

  if (tooManyFiles) {
    status = "blocked";
    diagnostics.push({
      code: "TOO_MANY_FILES",
      message: `Staged files count (${stagedFiles.length}) exceeds maximum limit of 500 files`,
      retryable: false,
    });
  }

  if (unstagedConflicts.length > 0) {
    status = "blocked";
    diagnostics.push({
      code: "UNSTAGED_CONFLICT",
      message: `Unstaged changes detected in already-staged files: ${unstagedConflicts.join(", ")}`,
      retryable: false,
    });
  }

  if (isContradictoryUsId) {
    if (status !== "blocked") {
      status = "needs_input";
    }
    diagnostics.push({
      code: "CONTRADICTORY_US_ID",
      message: `Proposed US ID (${snapshot?.proposedUsId}) contradicts recent commit history (${snapshot?.primaryRecentUsId})`,
      retryable: false,
    });
  }

  if (unrelatedUnstaged.length > 0) {
    diagnostics.push({
      code: "UNSTAGED_CHANGES",
      message: `Working tree has ${unrelatedUnstaged.length} unstaged modification(s) unrelated to staged files`,
      retryable: false,
    });
  }

  // Gate selection algorithm
  const classified = classifyFiles(stagedFiles);
  let selectedGateId = "NONE";
  const reasonCodes = [];
  let checks = [];

  // Priority evaluation:
  // D > C > B > A > 0 > NONE
  if (intent === "close_batch" || intent === "close_us") {
    selectedGateId = "D";
    reasonCodes.push(intent === "close_batch" ? "INTENT_CLOSE_BATCH" : "INTENT_CLOSE_US");
    checks = [
      "npm run lint",
      "npx tsc --noEmit",
      "npx tsc --project tsconfig.cucumber.json --noEmit",
      "npm run test",
      "make test-e2e-managed",
      "verify no @wip tags remaining in scope",
      "verify clean working tree",
      "verify CI status green",
    ];
  } else if (classified.hasGateCTrigger) {
    selectedGateId = "C";
    reasonCodes.push("SHARED_OR_HIGH_RISK_CHANGES");
    checks = [
      "npm run lint",
      "npx tsc --noEmit",
      "npx tsc --project tsconfig.cucumber.json --noEmit",
      "npm run test",
      "make test-e2e-managed",
    ];
  } else if (intent === "close_scenario") {
    selectedGateId = "B";
    reasonCodes.push("INTENT_CLOSE_SCENARIO_LOW_RISK");

    let targetFeature = featureFile;
    if (!targetFeature) {
      const stagedFeatures = stagedFiles.filter((f) => f.endsWith(".feature"));
      if (stagedFeatures.length === 1) {
        targetFeature = stagedFeatures[0];
      }
    }

    if (targetFeature) {
      checks = [`make test-e2e-managed E2E_FILE=${targetFeature}`];
    } else {
      checks = ["make test-e2e-managed E2E_FILE=<featureFile>"];
      if (status !== "blocked") {
        status = "needs_input";
      }
      diagnostics.push({
        code: "MISSING_FEATURE_FOR_GATE_B",
        message: "Gate B requires featureFile or scenarioName when unable to infer a single feature from staged files",
        retryable: false,
      });
    }
  } else if (classified.hasOnlyGate0) {
    selectedGateId = "0";
    reasonCodes.push("E2E_STEPS_OR_FEATURES_ONLY");
    checks = ["make test-e2e-steps-compatible"];
  } else if (classified.hasIsolatedProduction) {
    selectedGateId = "A";
    reasonCodes.push("ISOLATED_PRODUCTION_CODE");
    checks = ["npm run test -- <pattern>", "npx tsc --noEmit"];
    if (classified.hasGate0Trigger) {
      reasonCodes.push("INCLUDES_E2E_STEPS_OR_SUPPORT");
      checks.push("npx tsc --project tsconfig.cucumber.json --noEmit");
    }
  } else if (classified.hasOnlyDocsOrConfig) {
    selectedGateId = "NONE";
    reasonCodes.push("DOCS_CONFIG_TESTS_OR_STYLES_ONLY");
    checks = [];
  } else {
    // Mixed changes fallback to highest coverage
    if (classified.hasGate0Trigger) {
      selectedGateId = "0";
      reasonCodes.push("E2E_STEPS_OR_FEATURES_INCLUDED");
      checks = ["make test-e2e-steps-compatible"];
    } else {
      selectedGateId = "NONE";
      reasonCodes.push("NON_FUNCTIONAL_CHANGES");
      checks = [];
    }
  }

  // Maintainability review required check
  if (maintainability?.status === "review_required" || (maintainability?.signalCount || 0) > 0) {
    if (status === "ready") {
      status = "review_required";
    }
    diagnostics.push({
      code: "MAINTAINABILITY_SIGNALS",
      message: `${maintainability.signalCount} maintainability signal(s) detected in changed code; review required before commit`,
      retryable: false,
    });
  }

  return {
    gate: {
      id: selectedGateId,
      reasonCodes,
      checks,
    },
    status,
    diagnostics: diagnostics.slice(0, 20),
  };
}
