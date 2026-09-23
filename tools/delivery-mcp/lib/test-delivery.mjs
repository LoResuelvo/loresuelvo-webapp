import { findRepoRoot } from "./repo-root.mjs";
import {
  claimDeliveryJob,
  createWorkingTreeJobSubject,
  spawnJobWorker,
} from "./jobs.mjs";
import {
  computeTddCacheKey,
  computeRepositoryInputFingerprint,
  cacheInputErrorResult,
  readTddCache,
  writeTddCache,
} from "./test-delivery-cache.mjs";
import {
  DEFAULT_TEST_TIMEOUT_MS,
  executeProcessDefault,
} from "./test-delivery-process.mjs";
import {
  executeUnitPlan,
  executeScenarioPlan,
  executeDiagnosticPlan,
  executeAffectedPlan,
} from "./test-delivery-execution.mjs";
import {
  planUnit,
  planScenario,
  planDiagnostic,
  planAffected,
} from "./test-delivery-planning.mjs";
export { parseTestCounts } from "./test-delivery-execution.mjs";
export { executeProcessDefault } from "./test-delivery-process.mjs";
export {
  computeFileHash,
  computeTddCacheKey,
  computeRepositoryInputFingerprint,
  readTddCache,
  writeTddCache,
} from "./test-delivery-cache.mjs";
export {
  getTestExtension,
  validateTestFilePath,
  validateFeatureFilePath,
  scenarioHasWipTag,
  validateScenarioName,
  findRelatedUnitTestsForSource,
  resolveAffectedFeaturesForSteps,
  findAffectedFeaturesForSteps,
} from "./test-delivery-scope.mjs";

const TEST_EXECUTION_MODES = new Set(["sync", "job", "auto"]);

export function shouldUseDeliveryTestJob({
  mode,
  executionMode = "auto",
  diagnosticTimeoutMs = 0,
  workerJobId = null,
  executeDefault = true,
} = {}) {
  if (workerJobId) return false;
  if (executionMode === "job") return true;
  if (executionMode !== "auto" || !executeDefault) return false;
  if (mode === "scenario" || mode === "affected") return true;
  return mode === "diagnostic" && Number(diagnosticTimeoutMs) > DEFAULT_TEST_TIMEOUT_MS;
}

function invalidExecutionModeResult(mode, executionMode) {
  return {
    status: "error",
    mode: mode || "unknown",
    executionMode,
    cached: false,
    durationMs: 0,
    counts: { passed: 0, failed: 0, skipped: 0 },
    diagnostics: [
      {
        code: "INVALID_EXECUTION_MODE",
        message: `Unknown executionMode: '${executionMode}'. Supported modes: sync, job, auto`,
        retryable: false,
      },
    ],
  };
}

function queuedTestResult({
  mode,
  executionMode,
  jobId,
  status = "job_started",
  message,
  selection,
}) {
  return {
    status,
    mode,
    executionMode,
    jobId,
    cached: false,
    durationMs: 0,
    counts: { passed: 0, failed: 0, skipped: 0 },
    diagnostics: [],
    message,
    ...(selection || {}),
  };
}

async function enqueueTestDeliveryJob({
  repoRoot,
  mode,
  testFiles,
  featureFile,
  scenarioName,
  checkId,
  force,
  timeoutMs,
  cacheKey,
  inputFingerprint,
  selection,
}) {
  const runKey = `delivery-test-${cacheKey}`;
  const { job, claimed } = await claimDeliveryJob({
    repoRoot,
    type: "test",
    params: {
      mode,
      ...(testFiles ? { testFiles } : {}),
      ...(featureFile ? { featureFile } : {}),
      ...(scenarioName ? { scenarioName } : {}),
      ...(checkId ? { checkId } : {}),
      force,
      timeoutMs,
      // The worker owns this job and must always execute synchronously. This
      // value is persisted so a recovered worker cannot enqueue itself.
      executionMode: "sync",
    },
    runKey,
    subject: createWorkingTreeJobSubject(inputFingerprint),
    gateId: `TEST_${mode}`,
  });

  if (claimed) await spawnJobWorker({ repoRoot, jobId: job.jobId });
  return queuedTestResult({
    mode,
    executionMode: "job",
    jobId: job.jobId,
    status: claimed ? "job_started" : "running",
    message: `delivery_test '${mode}' is running as recoverable background job '${job.jobId}'. Use delivery_job_wait to await completion.`,
    selection,
  });
}




export async function testDelivery({
  repoRoot: customRepoRoot,
  mode = "affected",
  executionMode = "auto",
  async: isAsync = false,
  testFiles,
  featureFile,
  scenarioName,
  checkId,
  force = false,
  timeoutMs = DEFAULT_TEST_TIMEOUT_MS,
  executeFn = executeProcessDefault,
  // Internal marker used by job-runner. The worker already owns the job, so
  // it must never discover and deduplicate against its own running record.
  workerJobId = null,
} = {}) {
  const repoRoot = findRepoRoot(customRepoRoot);
  const requestedExecutionMode = isAsync ? "job" : executionMode;

  if (!TEST_EXECUTION_MODES.has(requestedExecutionMode)) {
    return invalidExecutionModeResult(mode, requestedExecutionMode);
  }

  if (!["affected", "unit", "scenario", "diagnostic"].includes(mode)) {
    return {
      status: "error",
      mode: mode || "unknown",
      executionMode: requestedExecutionMode,
      cached: false,
      durationMs: 0,
      counts: { passed: 0, failed: 0, skipped: 0 },
      diagnostics: [
        {
          code: "INVALID_MODE",
          message: `Unknown mode: '${mode}'. Supported modes: affected, unit, scenario, diagnostic`,
          retryable: false,
        },
      ],
    };
  }

  // --- MODE: UNIT ---
  if (mode === "unit") {
    const planned = planUnit({ repoRoot, testFiles });
    if (planned.status) return planned;
    const { normalizedFiles, command, args } = planned;

    let inputFingerprint;
    try {
      inputFingerprint = await computeRepositoryInputFingerprint(repoRoot);
    } catch (error) {
      return cacheInputErrorResult("unit", `Unable to fingerprint test inputs: ${error.message}`);
    }
    if (inputFingerprint.errors.length > 0) {
      return cacheInputErrorResult("unit", inputFingerprint.errors[0]);
    }

    const cacheKey = computeTddCacheKey({
      mode: "unit",
      files: normalizedFiles,
      command,
      args,
      timeoutMs,
      inputFingerprint: inputFingerprint.hash,
    });

    if (!force) {
      const cached = await readTddCache(repoRoot, cacheKey, { fingerprint: inputFingerprint.hash, mode });
      if (cached) return cached;
    }

    if (
      shouldUseDeliveryTestJob({
        mode: "unit",
        executionMode: requestedExecutionMode,
        workerJobId,
        executeDefault: executeFn === executeProcessDefault,
      })
    ) {
      return enqueueTestDeliveryJob({
        repoRoot,
        mode: "unit",
        testFiles: normalizedFiles,
        force,
        timeoutMs,
        cacheKey,
        inputFingerprint,
      });
    }

    const result = await executeUnitPlan({ repoRoot, command, args, normalizedFiles, timeoutMs, executeFn });
    await writeTddCache(repoRoot, cacheKey, result, { fingerprint: inputFingerprint.hash, mode });
    return result;
  }

  // --- MODE: SCENARIO ---
  if (mode === "scenario") {
    const planned = planScenario({ repoRoot, featureFile, scenarioName });
    if (planned.status) return planned;
    const { validatedFeatureFile, validatedScenarioName, targetIsWip, command, args } = planned;

    let inputFingerprint;
    try {
      inputFingerprint = await computeRepositoryInputFingerprint(repoRoot);
    } catch (error) {
      return cacheInputErrorResult("scenario", `Unable to fingerprint scenario inputs: ${error.message}`);
    }
    if (inputFingerprint.errors.length > 0) {
      return cacheInputErrorResult("scenario", inputFingerprint.errors[0]);
    }

    const cacheKey = computeTddCacheKey({
      mode: "scenario",
      featureFile: validatedFeatureFile,
      scenarioName: validatedScenarioName,
      targetIsWip,
      command,
      args,
      timeoutMs,
      inputFingerprint: inputFingerprint.hash,
    });

    if (!force) {
      const cached = await readTddCache(repoRoot, cacheKey, { fingerprint: inputFingerprint.hash, mode });
      if (cached) return cached;
    }

    if (
      shouldUseDeliveryTestJob({
        mode: "scenario",
        executionMode: requestedExecutionMode,
        workerJobId,
        executeDefault: executeFn === executeProcessDefault,
      })
    ) {
      return enqueueTestDeliveryJob({
        repoRoot,
        mode: "scenario",
        featureFile: validatedFeatureFile,
        scenarioName: validatedScenarioName,
        force,
        timeoutMs,
        cacheKey,
        inputFingerprint,
      });
    }

    const result = await executeScenarioPlan({ repoRoot, command, args, timeoutMs, executeFn });
    await writeTddCache(repoRoot, cacheKey, result, { fingerprint: inputFingerprint.hash, mode });
    return result;
  }

  // --- MODE: DIAGNOSTIC ---
  if (mode === "diagnostic") {
    const planned = await planDiagnostic({ repoRoot, checkId, featureFile });
    if (planned.status) return planned;
    const { policy, definition, resolved } = planned;

    let inputFingerprint;
    try {
      inputFingerprint = await computeRepositoryInputFingerprint(repoRoot, {
        policyHash: policy.sourceHash || null,
      });
    } catch (error) {
      return cacheInputErrorResult("diagnostic", `Unable to fingerprint diagnostic inputs: ${error.message}`, {
        checkId,
      });
    }
    if (inputFingerprint.errors.length > 0) {
      return cacheInputErrorResult("diagnostic", inputFingerprint.errors[0], { checkId });
    }

    const cacheKey = computeTddCacheKey({
      mode: "diagnostic",
      checkId,
      definition,
      resolvedCommand: resolved.command,
      resolvedArgs: resolved.args,
      parameters: resolved.parameters,
      timeoutMs: resolved.timeoutMs || timeoutMs,
      inputFingerprint: inputFingerprint.hash,
    });

    if (!force) {
      const cached = await readTddCache(repoRoot, cacheKey, { fingerprint: inputFingerprint.hash, mode });
      if (cached) return cached;
    }

    if (
      shouldUseDeliveryTestJob({
        mode: "diagnostic",
        executionMode: requestedExecutionMode,
        diagnosticTimeoutMs: resolved.timeoutMs || timeoutMs,
        workerJobId,
        executeDefault: executeFn === executeProcessDefault,
      })
    ) {
      return enqueueTestDeliveryJob({
        repoRoot,
        mode: "diagnostic",
        checkId,
        force,
        timeoutMs: resolved.timeoutMs || timeoutMs,
        cacheKey,
        inputFingerprint,
      });
    }

    const result = await executeDiagnosticPlan({ repoRoot, checkId, resolved, policy, timeoutMs, executeFn });
    await writeTddCache(repoRoot, cacheKey, result, { fingerprint: inputFingerprint.hash, mode });
    return result;
  }

  // --- MODE: AFFECTED ---
  const planned = await planAffected({ repoRoot });
  if (planned.status) return planned;
  const {
    allChangedFiles, changedSteps, changedProductionFiles, unmappedOrConfigFiles,
    resolvedFeatures, resolvedUnitTests, selectedFeatureFiles, selectedUnitTestFiles,
    affectedPolicyCheckIds, selectedCheckIds, cucumberResolution,
  } = planned;

  let inputFingerprint;
  try {
    inputFingerprint = await computeRepositoryInputFingerprint(repoRoot);
  } catch (error) {
    return cacheInputErrorResult("affected", `Unable to fingerprint affected-test inputs: ${error.message}`);
  }
  if (inputFingerprint.errors.length > 0) {
    return cacheInputErrorResult("affected", inputFingerprint.errors[0]);
  }

  const cacheKey = computeTddCacheKey({
    mode: "affected",
    changedFiles: [...allChangedFiles].sort(),
    resolvedUnitTests: [...resolvedUnitTests].sort(),
    resolvedFeatures: [...resolvedFeatures].sort(),
    inputFingerprint: inputFingerprint.hash,
  });

  if (!force) {
    const cached = await readTddCache(repoRoot, cacheKey, { fingerprint: inputFingerprint.hash, mode });
    if (cached) return cached;
  }

  if (cucumberResolution?.confidence === "low") {
    const result = {
      status: "blocked",
      mode: "affected",
      durationMs: 0,
      cached: false,
      counts: { passed: 0, failed: 0, skipped: 0 },
      selectedFeatureFiles,
      selectedUnitTestFiles,
      selectedCheckIds: [],
      diagnostics: [
        {
          code: "AMBIGUOUS_STEP_IMPACT",
          message: `Unable to map changed Cucumber steps ${changedSteps
            .sort()
            .join(", ")} to consumer features with high confidence. Select a feature explicitly with mode: 'scenario' or run diagnostic check 'steps_compatibility'.`,
          retryable: false,
        },
      ],
    };
    await writeTddCache(repoRoot, cacheKey, result, { fingerprint: inputFingerprint.hash, mode });
    return result;
  }

  // Check ambiguity
  const hasAmbiguousChange =
    (resolvedUnitTests.size === 0 &&
      resolvedFeatures.size === 0 &&
      affectedPolicyCheckIds.length === 0) ||
    (changedProductionFiles.length > 0 && resolvedUnitTests.size === 0) ||
    unmappedOrConfigFiles.some((f) => f === "package.json" || f.startsWith("tsconfig") || f.includes(".delivery/policy"));

  if (
    resolvedUnitTests.size === 0 &&
    resolvedFeatures.size === 0 &&
    affectedPolicyCheckIds.length === 0
  ) {
    // Report clear diagnostic state
    const result = {
      status: "blocked",
      mode: "affected",
      durationMs: 0,
      cached: false,
      counts: { passed: 0, failed: 0, skipped: 0 },
      selectedFeatureFiles,
      selectedUnitTestFiles,
      selectedCheckIds,
      diagnostics: [
        {
          code: "AMBIGUOUS_AFFECTED_SCOPE",
          message:
            "Changed files cannot be cleanly mapped to isolated tests. Run full diagnostic suite with mode: 'diagnostic', checkId: 'unit'",
          retryable: false,
        },
      ],
    };
    await writeTddCache(repoRoot, cacheKey, result, { fingerprint: inputFingerprint.hash, mode });
    return result;
  }

  if (
    shouldUseDeliveryTestJob({
      mode: "affected",
      executionMode: requestedExecutionMode,
      workerJobId,
      executeDefault: executeFn === executeProcessDefault,
    })
  ) {
    return enqueueTestDeliveryJob({
      repoRoot,
      mode: "affected",
      force,
      timeoutMs,
      cacheKey,
      inputFingerprint,
      selection: {
        selectedFeatureFiles,
        selectedUnitTestFiles,
        selectedCheckIds,
      },
    });
  }

  const result = await executeAffectedPlan({
    repoRoot, plan: planned, force, timeoutMs, executeFn, workerJobId,
    hasAmbiguousChange, runTest: testDelivery,
  });
  await writeTddCache(repoRoot, cacheKey, result, { fingerprint: inputFingerprint.hash, mode });
  return result;
}
