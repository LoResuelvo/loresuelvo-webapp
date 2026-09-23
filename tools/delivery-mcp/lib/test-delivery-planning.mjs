import path from "node:path";
import { loadDeliveryPolicy } from "./policy-loader.mjs";
import { redactSecrets } from "./redact-secrets.mjs";
import { parsePorcelainStatus, runGit } from "./git-snapshot.mjs";
import { SUPPORTED_CUCUMBER_STEP_EXTENSIONS } from "./impact-index.mjs";
import { isProductionSourceFile } from "./classify-files.mjs";
import { resolveCheck } from "./execute-check.mjs";
import { cacheInputErrorResult } from "./test-delivery-cache.mjs";
import {
  getTestExtension, validateTestFilePath, validateFeatureFilePath,
  validateScenarioName, scenarioHasWipTag, findRelatedUnitTestsForSource,
  resolveAffectedFeaturesForSteps,
} from "./test-delivery-scope.mjs";

const CUCUMBER_STEP_CANDIDATE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);

export function planUnit({ repoRoot, testFiles }) {
  if (!Array.isArray(testFiles) || testFiles.length === 0) {
    return {
      status: "error",
      mode: "unit",
      cached: false,
      durationMs: 0,
      counts: { passed: 0, failed: 0, skipped: 0 },
      diagnostics: [
        {
          code: "MISSING_PARAMETER",
          message: "Mode 'unit' requires 'testFiles' array with at least one test file",
          retryable: false,
        },
      ],
    };
  }

  const validatedFiles = [];
  for (const file of testFiles) {
    try {
      validatedFiles.push(validateTestFilePath(repoRoot, file));
    } catch (err) {
      return {
        status: "error",
        mode: "unit",
        cached: false,
        durationMs: 0,
        counts: { passed: 0, failed: 0, skipped: 0 },
        diagnostics: [
          {
            code: err.code || "INVALID_TEST_FILE",
            message: redactSecrets(err.message),
            file,
            retryable: false,
          },
        ],
      };
    }
  }

  // Route to runner
  const normalizedFiles = [...new Set(validatedFiles)].sort();
  const allNodeTests = normalizedFiles.every((f) => f.endsWith(".mjs") || f.startsWith("tools/"));
  let command;
  let args;
  if (allNodeTests) {
    command = "node";
    args = ["--test", "--test-concurrency=1", ...normalizedFiles];
  } else {
    command = "npx";
    args = ["--no-install", "vitest", "run", ...normalizedFiles];
  }
  return { normalizedFiles, command, args };
}

export function planScenario({ repoRoot, featureFile, scenarioName }) {
  if (!featureFile) {
    return {
      status: "error",
      mode: "scenario",
      cached: false,
      durationMs: 0,
      counts: { passed: 0, failed: 0, skipped: 0 },
      diagnostics: [
        {
          code: "MISSING_PARAMETER",
          message: "Mode 'scenario' requires 'featureFile' parameter",
          retryable: false,
        },
      ],
    };
  }

  let validatedFeatureFile;
  try {
    validatedFeatureFile = validateFeatureFilePath(repoRoot, featureFile);
  } catch (err) {
    return {
      status: "error",
      mode: "scenario",
      cached: false,
      durationMs: 0,
      counts: { passed: 0, failed: 0, skipped: 0 },
      diagnostics: [
        {
          code: err.code || "INVALID_FEATURE_FILE",
          message: redactSecrets(err.message),
          file: featureFile,
          retryable: false,
        },
      ],
    };
  }

  let validatedScenarioName = null;
  if (scenarioName) {
    try {
      validatedScenarioName = validateScenarioName(scenarioName);
    } catch (err) {
      return {
        status: "error",
        mode: "scenario",
        cached: false,
        durationMs: 0,
        counts: { passed: 0, failed: 0, skipped: 0 },
        diagnostics: [
          {
            code: err.code || "INVALID_SCENARIO_NAME",
            message: redactSecrets(err.message),
            retryable: false,
          },
        ],
      };
    }
  }

  let targetIsWip = false;
  try {
    targetIsWip = scenarioHasWipTag(repoRoot, validatedFeatureFile, validatedScenarioName);
  } catch (error) {
    return cacheInputErrorResult("scenario", `Unable to inspect feature tags: ${error.message}`);
  }

  // Always use the managed runner: it builds the app, owns the test port,
  // starts/stops Next.js, and emits a report proving that at least one
  // scenario was selected.  The wip profile is opt-in only for a requested
  // scenario that is actually tagged @wip; completed scenarios stay on the
  // default `not @wip` profile.
  const command = "make";
  const args = [
    "test-e2e-managed",
    `E2E_FILE=${validatedFeatureFile}`,
    "E2E_REQUIRE_SCENARIO=1",
  ];
  if (targetIsWip) args.push("E2E_PROFILE=wip");
  if (validatedScenarioName) args.push(`E2E_NAME=${validatedScenarioName}`);
  return { validatedFeatureFile, validatedScenarioName, targetIsWip, command, args };
}

export async function planDiagnostic({ repoRoot, checkId, featureFile }) {
  if (!checkId) {
    return {
      status: "error",
      mode: "diagnostic",
      cached: false,
      durationMs: 0,
      counts: { passed: 0, failed: 0, skipped: 0 },
      diagnostics: [
        {
          code: "MISSING_PARAMETER",
          message: "Mode 'diagnostic' requires 'checkId' parameter",
          retryable: false,
        },
      ],
    };
  }

  let policy;
  try {
    policy = await loadDeliveryPolicy({ repoRoot });
  } catch (err) {
    return {
      status: "error",
      mode: "diagnostic",
      checkId,
      cached: false,
      durationMs: 0,
      counts: { passed: 0, failed: 0, skipped: 0 },
      diagnostics: [
        {
          code: "POLICY_ERROR",
          message: redactSecrets(err.message),
          retryable: false,
        },
      ],
    };
  }

  const definition = policy.checkCatalog?.[checkId];
  if (!definition) {
    const published = Object.keys(policy.checkCatalog || {}).join(", ");
    return {
      status: "error",
      mode: "diagnostic",
      checkId,
      cached: false,
      durationMs: 0,
      counts: { passed: 0, failed: 0, skipped: 0 },
      diagnostics: [
        {
          code: "UNKNOWN_CHECK",
          message: `Unknown checkId '${checkId}'. Published catalog checks: ${published}`,
          retryable: false,
        },
      ],
    };
  }

  let resolved;
  try {
    resolved = resolveCheck({
      checkId,
      definition,
      parameters: { featureFile },
      repoRoot,
    });
  } catch (err) {
    return {
      status: "error",
      mode: "diagnostic",
      checkId,
      cached: false,
      durationMs: 0,
      counts: { passed: 0, failed: 0, skipped: 0 },
      diagnostics: [
        {
          code: "CHECK_INPUT_INVALID",
          message: redactSecrets(err.message),
          retryable: false,
        },
      ],
    };
  }
  return { policy, definition, resolved };
}

export async function planAffected({ repoRoot }) {
  const statusRes = await runGit(["status", "--porcelain", "-z", "--untracked-files=all"], repoRoot);
  if (statusRes.error) {
    return {
      status: "error",
      mode: "affected",
      durationMs: 0,
      cached: false,
      counts: { passed: 0, failed: 0, skipped: 0 },
      selectedFeatureFiles: [],
      selectedUnitTestFiles: [],
      selectedCheckIds: [],
      diagnostics: [
        {
          code: "GIT_STATUS_FAILED",
          message: redactSecrets(statusRes.error.message || "Unable to read Git working-tree status"),
          retryable: true,
        },
      ],
    };
  }
  const { staged, unstaged, untracked } = parsePorcelainStatus(statusRes.stdout);
  const allChangedFiles = [
    ...new Set([
      ...staged.map((s) => s.file),
      ...unstaged.map((u) => u.file),
      ...untracked,
    ]),
  ].filter((f) => !f.startsWith(".delivery/runtime/") && !f.startsWith(".git/"));

  // 1. Working tree has no changes
  if (allChangedFiles.length === 0) {
    return {
      status: "passed",
      mode: "affected",
      durationMs: 0,
      cached: false,
      counts: { passed: 0, failed: 0, skipped: 0 },
      selectedFeatureFiles: [],
      selectedUnitTestFiles: [],
      selectedCheckIds: [],
      diagnostics: [
        {
          code: "NO_CHANGES",
          message: "Working tree has no changes to test",
          retryable: false,
        },
      ],
    };
  }

  // Separate changed files
  const changedFeatures = allChangedFiles.filter((f) => f.endsWith(".feature"));
  const changedUnitTests = allChangedFiles.filter((f) => getTestExtension(f) !== null);
  const changedSteps = allChangedFiles.filter(
    (file) =>
      file.startsWith("features/") &&
      getTestExtension(file) === null &&
      SUPPORTED_CUCUMBER_STEP_EXTENSIONS.includes(path.posix.extname(file))
  );
  const unsupportedCucumberStepFiles = allChangedFiles.filter((file) => {
    if (!file.startsWith("features/") || file.endsWith(".feature") || getTestExtension(file)) {
      return false;
    }
    const extension = path.posix.extname(file);
    return (
      CUCUMBER_STEP_CANDIDATE_EXTENSIONS.has(extension) &&
      !SUPPORTED_CUCUMBER_STEP_EXTENSIONS.includes(extension)
    );
  });
  const changedProductionFiles = allChangedFiles.filter(
    (f) => !f.startsWith("features/") && getTestExtension(f) === null && isProductionSourceFile(f)
  );
  const unmappedOrConfigFiles = allChangedFiles.filter(
    (f) =>
      !f.endsWith(".feature") &&
      !f.startsWith("features/") &&
      getTestExtension(f) === null &&
      !isProductionSourceFile(f)
  );

  if (unsupportedCucumberStepFiles.length > 0) {
    return {
      status: "blocked",
      mode: "affected",
      durationMs: 0,
      cached: false,
      counts: { passed: 0, failed: 0, skipped: 0 },
      selectedFeatureFiles: [],
      selectedUnitTestFiles: [],
      selectedCheckIds: [],
      diagnostics: [
        {
          code: "UNSUPPORTED_CUCUMBER_STEP_FORMAT",
          message: `Unsupported Cucumber source format in ${unsupportedCucumberStepFiles
            .sort()
            .join(", ")}. Supported step extensions: ${SUPPORTED_CUCUMBER_STEP_EXTENSIONS.join(", ")}`,
          retryable: false,
        },
      ],
    };
  }

  // Resolve affected features
  const resolvedFeatures = new Set(changedFeatures);
  let cucumberResolution = null;
  if (changedSteps.length > 0) {
    cucumberResolution = resolveAffectedFeaturesForSteps(repoRoot, changedSteps);
    for (const feat of cucumberResolution.featureFiles) resolvedFeatures.add(feat);
  }

  // Resolve affected unit tests
  const resolvedUnitTests = new Set(changedUnitTests);
  for (const stepFile of changedSteps) {
    const related = findRelatedUnitTestsForSource(repoRoot, stepFile);
    for (const test of related) resolvedUnitTests.add(test);
  }
  for (const prodFile of changedProductionFiles) {
    const related = findRelatedUnitTestsForSource(repoRoot, prodFile);
    for (const test of related) resolvedUnitTests.add(test);
  }
  for (const otherFile of unmappedOrConfigFiles) {
    const related = findRelatedUnitTestsForSource(repoRoot, otherFile);
    for (const test of related) resolvedUnitTests.add(test);
  }

  const selectedFeatureFiles = [...resolvedFeatures].sort();
  const selectedUnitTestFiles = [...resolvedUnitTests].sort();
  let affectedPolicyCheckIds = [];
  if (
    cucumberResolution?.gate === "0" &&
    cucumberResolution.reasonCodes.includes("NEW_STEP_NO_CONSUMERS")
  ) {
    try {
      const policy = await loadDeliveryPolicy({ repoRoot });
      affectedPolicyCheckIds = [...(policy.gates?.["0"]?.checkIds || [])];
    } catch (error) {
      return {
        status: "error",
        mode: "affected",
        durationMs: 0,
        cached: false,
        counts: { passed: 0, failed: 0, skipped: 0 },
        selectedFeatureFiles,
        selectedUnitTestFiles,
        selectedCheckIds: [],
        diagnostics: [
          {
            code: "POLICY_ERROR",
            message: redactSecrets(error instanceof Error ? error.message : String(error)),
            retryable: false,
          },
        ],
      };
    }
  }
  const selectedCheckIds = [
    ...new Set([
      ...(selectedUnitTestFiles.length > 0 ? ["unit"] : []),
      ...affectedPolicyCheckIds,
      ...(selectedFeatureFiles.length > 0 ? ["e2e_feature"] : []),
    ]),
  ];
  return {
    allChangedFiles, changedSteps, changedProductionFiles, unmappedOrConfigFiles,
    resolvedFeatures, resolvedUnitTests, selectedFeatureFiles, selectedUnitTestFiles,
    affectedPolicyCheckIds, selectedCheckIds, cucumberResolution,
  };
}
