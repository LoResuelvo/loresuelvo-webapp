import crypto from "node:crypto";
import path from "node:path";
import { redactSecrets } from "./redact-secrets.mjs";
import { executeCheck, computeFailureSignature } from "./execute-check.mjs";
import { TDD_RUNTIME_DIR } from "./test-delivery-cache.mjs";
import { executeProcessDefault } from "./test-delivery-process.mjs";


export function parseTestCounts(output) {
  const counts = { passed: 0, failed: 0, skipped: 0 };
  let found = false;

  if (!output || typeof output !== "string") {
    return { found: false, counts };
  }

  // 1. Vitest format: Tests  1 failed | 20 passed (21)
  const vitestMatch = output.match(/Tests\s+([^\n]+)/);
  if (vitestMatch) {
    const text = vitestMatch[1];
    const p = text.match(/(\d+)\s+passed/);
    const f = text.match(/(\d+)\s+failed/);
    const s = text.match(/(\d+)\s+(?:skipped|todo)/);
    if (p || f || s) {
      if (p) counts.passed = Number.parseInt(p[1], 10);
      if (f) counts.failed = Number.parseInt(f[1], 10);
      if (s) counts.skipped = Number.parseInt(s[1], 10);
      found = true;
    }
  }

  // 2. Node --test format: ℹ pass 12 \n ℹ fail 1
  if (!found) {
    const passM = output.match(/ℹ\s+pass\s+(\d+)/);
    const failM = output.match(/ℹ\s+fail\s+(\d+)/);
    const skipM = output.match(/ℹ\s+(?:skipped|cancelled)\s+(\d+)/);
    if (passM || failM) {
      if (passM) counts.passed = Number.parseInt(passM[1], 10);
      if (failM) counts.failed = Number.parseInt(failM[1], 10);
      if (skipM) counts.skipped = Number.parseInt(skipM[1], 10);
      found = true;
    }
  }

  // 3. Cucumber format: 2 scenarios (1 failed, 1 passed)
  if (!found) {
    const cukeMatch = output.match(/(\d+)\s+scenario[s]?\s*\(([^)]+)\)/);
    if (cukeMatch) {
      const details = cukeMatch[2];
      const p = details.match(/(\d+)\s+passed/);
      const f = details.match(/(\d+)\s+failed/);
      const s = details.match(/(\d+)\s+(?:skipped|pending|undefined)/);
      if (p) counts.passed = Number.parseInt(p[1], 10);
      if (f) counts.failed = Number.parseInt(f[1], 10);
      if (s) counts.skipped = Number.parseInt(s[1], 10);
      found = true;
    }
  }

  return { found, counts };
}

function hasExecutionCounts(value) {
  return (
    value &&
    typeof value === "object" &&
    ["passed", "failed", "skipped"].every(
      (key) => Number.isInteger(value[key]) && value[key] >= 0
    )
  );
}

function selectExecutionCounts(execResult, parsed, fallback) {
  if (hasExecutionCounts(execResult?.counts)) return { ...execResult.counts };
  if (parsed?.found) return parsed.counts;
  return fallback;
}


export async function executeUnitPlan({ repoRoot, command, args, normalizedFiles, timeoutMs, executeFn }) {
  const logId = crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36);
  const logPath = path.posix.join(TDD_RUNTIME_DIR, "logs", `unit-${logId}.log`);

  const execResult = await executeFn({
    command,
    args,
    cwd: repoRoot,
    timeoutMs,
    logPath,
  });

  const parsed = parseTestCounts(execResult.rawOutput);
  const counts = selectExecutionCounts(execResult, parsed, execResult.passed
    ? { passed: normalizedFiles.length, failed: 0, skipped: 0 }
    : { passed: 0, failed: normalizedFiles.length, skipped: 0 });

  const status = execResult.passed ? "passed" : "failed";
  const failureMsg = execResult.passed
    ? ""
    : redactSecrets(
        execResult.timedOut
          ? `Test execution timed out after ${timeoutMs}ms`
          : execResult.message || execResult.summaryLines?.[0] || "Unit test execution failed"
      );
  const failureLocations = (execResult.locations || []).slice(0, 6);
  const failureSummaryLines = (execResult.summaryLines || []).slice(0, 6).map((l) => redactSecrets(l));
  const failureCode =
    execResult.code || execResult.diagnostic?.code || (execResult.timedOut ? "CHECK_TIMEOUT" : "TEST_FAILED");
  const failureSignature = execResult.passed
    ? null
    : computeFailureSignature({
        checkId: "unit",
        exitCode: execResult.exitCode,
        message: failureMsg,
        locations: failureLocations,
      });

  const failure = execResult.passed
    ? undefined
    : {
        signature: failureSignature,
        code: failureCode,
        checkId: "unit",
        message: failureMsg,
        summaryLines: failureSummaryLines,
        locations: failureLocations,
        logPath: execResult.logPath || logPath,
        exitCode: execResult.exitCode ?? null,
      };

  const diagnostics = execResult.passed
    ? []
    : [
        {
          code: failureCode,
          message: failure.message,
          retryable: true,
        },
      ];

  const result = {
    status,
    mode: "unit",
    durationMs: execResult.durationMs,
    cached: false,
    counts,
    logPath,
    ...(failure ? { failure } : {}),
    diagnostics,
  };
  return result;
}

export async function executeScenarioPlan({ repoRoot, command, args, timeoutMs, executeFn }) {
  const logId = crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36);
  const logPath = path.posix.join(TDD_RUNTIME_DIR, "logs", `scenario-${logId}.log`);

  const execResult = await executeFn({
    command,
    args,
    cwd: repoRoot,
    env: {
      ...process.env,
      TS_NODE_PROJECT: "tsconfig.cucumber.json",
      APP_URL: process.env.APP_URL || "http://localhost:3001",
    },
    timeoutMs,
    logPath,
  });

  const parsed = parseTestCounts(execResult.rawOutput);
  const counts = selectExecutionCounts(execResult, parsed, {
    passed: 0,
    failed: execResult.passed ? 0 : 1,
    skipped: 0,
  });
  const executedScenarioCount = counts.passed + counts.failed + counts.skipped;
  const noScenariosExecuted = execResult.passed && executedScenarioCount === 0;
  const effectivePassed = execResult.passed && !noScenariosExecuted;

  const status = effectivePassed ? "passed" : "failed";
  const failureMsg = effectivePassed
    ? ""
    : redactSecrets(
        noScenariosExecuted
          ? "Managed Cucumber runner executed zero scenarios"
          : execResult.timedOut
          ? `Scenario execution timed out after ${timeoutMs}ms`
          : execResult.message || execResult.summaryLines?.[0] || "Scenario execution failed"
      );
  const failureLocations = (execResult.locations || []).slice(0, 6);
  const failureSummaryLines = (execResult.summaryLines || []).slice(0, 6).map((l) => redactSecrets(l));
  const failureCode =
    execResult.code ||
    execResult.diagnostic?.code ||
    (noScenariosExecuted ? "NO_SCENARIOS_EXECUTED" : execResult.timedOut ? "CHECK_TIMEOUT" : "TEST_FAILED");
  const failure = effectivePassed
    ? null
    : computeFailureSignature({
        checkId: "scenario",
        exitCode: execResult.exitCode,
        message: failureMsg,
        locations: failureLocations,
      });

  const failureDetails = effectivePassed
    ? undefined
    : {
        signature: failure,
        code: failureCode,
        checkId: "scenario",
        message: failureMsg,
        summaryLines: failureSummaryLines,
        locations: failureLocations,
        logPath: execResult.logPath || logPath,
        exitCode: execResult.exitCode ?? null,
      };

  const diagnostics = effectivePassed
    ? []
    : [
        {
          code: failureCode,
          message: failureMsg,
          retryable: true,
        },
      ];

  const result = {
    status,
    mode: "scenario",
    durationMs: execResult.durationMs,
    cached: false,
    counts,
    logPath,
    ...(failureDetails ? { failure: failureDetails } : {}),
    diagnostics,
  };
  return result;
}

export async function executeDiagnosticPlan({ repoRoot, checkId, resolved, policy, timeoutMs, executeFn }) {
  const logId = crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36);
  const logPath = path.posix.join(TDD_RUNTIME_DIR, "logs", `diag-${checkId}-${logId}.log`);

  let execResult;
  if (executeFn !== executeProcessDefault) {
    // Test-injected runner
    execResult = await executeFn({
      command: resolved.command,
      args: resolved.args,
      cwd: repoRoot,
      timeoutMs: resolved.timeoutMs || timeoutMs,
      logPath,
    });
  } else {
    const checkOutcome = await executeCheck({
      check: resolved,
      repoRoot,
      logPath,
      limits: policy.limits,
    });
    execResult = {
      passed: checkOutcome.status === "passed",
      timedOut: checkOutcome.diagnostic?.code === "CHECK_TIMEOUT",
      exitCode: checkOutcome.exitCode,
      durationMs: checkOutcome.durationMs,
      summaryLines: checkOutcome.summaryLines,
      locations: checkOutcome.locations,
      rawOutput: checkOutcome.rawOutput || checkOutcome.summaryLines?.join("\n") || "",
      outputTail: checkOutcome.outputTail || "",
      outputTruncated: Boolean(checkOutcome.outputTruncated),
      counts: checkOutcome.counts,
      code: checkOutcome.code || checkOutcome.diagnostic?.code,
      message: checkOutcome.message || checkOutcome.diagnostic?.message,
      logPath: checkOutcome.logPath || logPath,
    };
  }

  const parsed = parseTestCounts(execResult.rawOutput);
  const counts = selectExecutionCounts(execResult, parsed, execResult.passed
    ? { passed: 1, failed: 0, skipped: 0 }
    : { passed: 0, failed: 1, skipped: 0 });

  const status = execResult.passed ? "passed" : "failed";
  const failureMsg = execResult.passed
    ? ""
    : redactSecrets(
        execResult.timedOut
          ? `Diagnostic check '${checkId}' timed out`
          : execResult.message || execResult.summaryLines?.[0] || `Diagnostic check '${checkId}' failed`
      );
  const failureLocations = (execResult.locations || []).slice(0, 6);
  const failureSummaryLines = (execResult.summaryLines || []).slice(0, 6).map((l) => redactSecrets(l));
  const failureCode =
    execResult.code ||
    execResult.diagnostic?.code ||
    (execResult.timedOut ? "CHECK_TIMEOUT" : "DIAGNOSTIC_CHECK_FAILED");
  const failureSignature = execResult.passed
    ? null
    : computeFailureSignature({
        checkId,
        exitCode: execResult.exitCode,
        message: failureMsg,
        locations: failureLocations,
      });

  const failure = execResult.passed
    ? undefined
    : {
        signature: failureSignature,
        code: failureCode,
        checkId,
        message: failureMsg,
        summaryLines: failureSummaryLines,
        locations: failureLocations,
        logPath: execResult.logPath || logPath,
        exitCode: execResult.exitCode ?? null,
      };

  const diagnostics = execResult.passed
    ? []
    : [
        {
          code: failureCode,
          message: failure.message,
          retryable: true,
        },
      ];

  const result = {
    status,
    mode: "diagnostic",
    checkId,
    durationMs: execResult.durationMs,
    cached: false,
    counts,
    logPath,
    ...(failure ? { failure } : {}),
    diagnostics,
  };
  return result;
}

export async function executeAffectedPlan({
  repoRoot, plan, force, timeoutMs, executeFn, workerJobId, hasAmbiguousChange, runTest,
}) {
  const {
    resolvedUnitTests, resolvedFeatures, affectedPolicyCheckIds,
    selectedFeatureFiles, selectedUnitTestFiles, selectedCheckIds,
  } = plan;
  // Execute affected tests
  let totalDurationMs = 0;
  let overallStatus = "passed";
  const combinedCounts = { passed: 0, failed: 0, skipped: 0 };
  const allDiagnostics = [];
  let primaryFailure = undefined;

  // Run affected unit tests if any
  if (resolvedUnitTests.size > 0) {
    const unitResult = await runTest({
      repoRoot,
      mode: "unit",
      testFiles: [...resolvedUnitTests],
      force,
      timeoutMs,
      executeFn,
      workerJobId,
    });
    totalDurationMs += unitResult.durationMs || 0;
    combinedCounts.passed += unitResult.counts?.passed || 0;
    combinedCounts.failed += unitResult.counts?.failed || 0;
    combinedCounts.skipped += unitResult.counts?.skipped || 0;
    if (unitResult.diagnostics) allDiagnostics.push(...unitResult.diagnostics);
    if (unitResult.status === "failed" || unitResult.status === "error") {
      overallStatus = "failed";
      if (!primaryFailure && unitResult.failure) primaryFailure = unitResult.failure;
    } else if (unitResult.status === "blocked" && overallStatus === "passed") {
      overallStatus = "blocked";
    }
  }

  // A new step without consumers follows Gate 0 policy instead of being
  // mistaken for an unmapped affected scope.
  for (const checkId of affectedPolicyCheckIds) {
    const policyCheckResult = await runTest({
      repoRoot,
      mode: "diagnostic",
      checkId,
      force,
      timeoutMs,
      executeFn,
      workerJobId,
    });
    totalDurationMs += policyCheckResult.durationMs || 0;
    combinedCounts.passed += policyCheckResult.counts?.passed || 0;
    combinedCounts.failed += policyCheckResult.counts?.failed || 0;
    combinedCounts.skipped += policyCheckResult.counts?.skipped || 0;
    if (policyCheckResult.diagnostics) {
      allDiagnostics.push(...policyCheckResult.diagnostics);
    }
    if (policyCheckResult.status === "failed" || policyCheckResult.status === "error") {
      overallStatus = "failed";
      if (!primaryFailure && policyCheckResult.failure) {
        primaryFailure = policyCheckResult.failure;
      }
    } else if (policyCheckResult.status === "blocked" && overallStatus === "passed") {
      overallStatus = "blocked";
    }
  }

  // Run affected features if any
  if (resolvedFeatures.size > 0) {
    for (const feat of resolvedFeatures) {
      const featResult = await runTest({
        repoRoot,
        mode: "scenario",
        featureFile: feat,
        force,
        timeoutMs,
        executeFn,
        workerJobId,
      });
      totalDurationMs += featResult.durationMs || 0;
      combinedCounts.passed += featResult.counts?.passed || 0;
      combinedCounts.failed += featResult.counts?.failed || 0;
      combinedCounts.skipped += featResult.counts?.skipped || 0;
      if (featResult.diagnostics) allDiagnostics.push(...featResult.diagnostics);
      if (featResult.status === "failed" || featResult.status === "error") {
        overallStatus = "failed";
        if (!primaryFailure && featResult.failure) primaryFailure = featResult.failure;
      } else if (featResult.status === "blocked" && overallStatus === "passed") {
        overallStatus = "blocked";
      }
    }
  }

  if (hasAmbiguousChange) {
    if (overallStatus === "passed") overallStatus = "blocked";
    allDiagnostics.push({
      code: "AMBIGUOUS_AFFECTED_SCOPE",
      message: "Some modified files could not be mapped to tests with high confidence",
      retryable: false,
    });
  }

  const result = {
    status: overallStatus,
    mode: "affected",
    durationMs: totalDurationMs,
    cached: false,
    counts: combinedCounts,
    selectedFeatureFiles,
    selectedUnitTestFiles,
    selectedCheckIds,
    ...(primaryFailure ? { failure: primaryFailure } : {}),
    diagnostics: allDiagnostics,
  };
  return result;
}
