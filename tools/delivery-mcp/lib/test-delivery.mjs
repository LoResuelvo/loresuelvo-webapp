import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { findRepoRoot, assertSafeRepoPath } from "./repo-root.mjs";
import { loadDeliveryPolicy } from "./policy-loader.mjs";
import { redactSecrets } from "./redact-secrets.mjs";
import {
  executeCheck,
  resolveCheck,
  summarizeFailureOutput,
  extractLocations,
} from "./execute-check.mjs";
import { parsePorcelainStatus, runGit } from "./git-snapshot.mjs";
import {
  loadOrBuildCucumberImpactIndex,
  findFeatureFiles,
  analyzeCucumberImpact,
} from "./impact-index.mjs";
import { loadOrBuildTypeScriptImpactIndex } from "./dependency-impact.mjs";
import { isProductionSourceFile, normalizePath } from "./classify-files.mjs";

const ALLOWED_TEST_EXTENSIONS = new Set([
  ".test.ts",
  ".test.tsx",
  ".test.js",
  ".test.mjs",
  ".spec.ts",
  ".spec.tsx",
  ".spec.js",
  ".spec.mjs",
]);

const FEATURE_PATH_REGEX = /^[A-Za-z0-9._/-]+\.feature$/;
const SAFE_PATH_CHARS_REGEX = /^[A-Za-z0-9._/-]+$/;
const DEFAULT_TEST_TIMEOUT_MS = 180000;
const TDD_RUNTIME_DIR = ".delivery/runtime/tdd";

export function getTestExtension(filePath) {
  const lower = filePath.toLowerCase();
  for (const ext of ALLOWED_TEST_EXTENSIONS) {
    if (lower.endsWith(ext)) return ext;
  }
  return null;
}

export function validateTestFilePath(repoRoot, filePath) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    const error = new Error("Test file path cannot be empty");
    error.code = "INVALID_TEST_FILE";
    throw error;
  }

  const normalized = normalizePath(filePath);

  // Reject flags
  if (normalized.startsWith("-")) {
    const error = new Error(`Flag not allowed as test file: ${filePath}`);
    error.code = "INVALID_TEST_FILE";
    throw error;
  }

  // Reject globs
  if (/[\*\?\[\]\{\}]/.test(normalized)) {
    const error = new Error(`Glob patterns not allowed: ${filePath}`);
    error.code = "INVALID_TEST_FILE";
    throw error;
  }

  // Reject path traversal
  if (normalized.split("/").includes("..")) {
    const error = new Error(`Path traversal rejected: ${filePath}`);
    error.code = "PATH_TRAVERSAL";
    throw error;
  }

  // Reject malicious / shell characters
  if (!SAFE_PATH_CHARS_REGEX.test(normalized)) {
    const error = new Error(`Invalid characters in test path: ${filePath}`);
    error.code = "INVALID_TEST_FILE";
    throw error;
  }

  // Enforce test extension
  const ext = getTestExtension(normalized);
  if (!ext) {
    const error = new Error(
      `File is not an authorized test file (expected .test.ts, .test.tsx, .test.mjs, .test.js): ${filePath}`
    );
    error.code = "INVALID_TEST_FILE";
    throw error;
  }

  assertSafeRepoPath(repoRoot, normalized, "Test file path");

  const absolutePath = path.resolve(repoRoot, normalized);
  if (!fs.existsSync(absolutePath)) {
    const error = new Error(`Test file not found: ${filePath}`);
    error.code = "TEST_FILE_NOT_FOUND";
    throw error;
  }

  return normalized;
}

export function validateFeatureFilePath(repoRoot, filePath) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    const error = new Error("Feature file path cannot be empty");
    error.code = "INVALID_FEATURE_FILE";
    throw error;
  }

  const normalized = normalizePath(filePath);

  if (normalized.startsWith("-")) {
    const error = new Error(`Flag not allowed as feature file: ${filePath}`);
    error.code = "INVALID_FEATURE_FILE";
    throw error;
  }

  if (/[\*\?\[\]\{\}]/.test(normalized)) {
    const error = new Error(`Glob patterns not allowed: ${filePath}`);
    error.code = "INVALID_FEATURE_FILE";
    throw error;
  }

  if (normalized.split("/").includes("..")) {
    const error = new Error(`Path traversal rejected: ${filePath}`);
    error.code = "PATH_TRAVERSAL";
    throw error;
  }

  if (!FEATURE_PATH_REGEX.test(normalized) || !SAFE_PATH_CHARS_REGEX.test(normalized)) {
    const error = new Error(`File is not an authorized feature file (.feature): ${filePath}`);
    error.code = "INVALID_FEATURE_FILE";
    throw error;
  }

  assertSafeRepoPath(repoRoot, normalized, "Feature file path");

  const absolutePath = path.resolve(repoRoot, normalized);
  if (!fs.existsSync(absolutePath)) {
    const error = new Error(`Feature file not found: ${filePath}`);
    error.code = "FEATURE_FILE_NOT_FOUND";
    throw error;
  }

  return normalized;
}

export function validateScenarioName(name) {
  if (!name) return null;
  if (typeof name !== "string") {
    const error = new Error("Scenario name must be a string");
    error.code = "INVALID_SCENARIO_NAME";
    throw error;
  }
  const trimmed = name.trim();
  if (!trimmed) return null;

  // Reject newlines or control characters
  if (/[\r\n\0]/.test(trimmed)) {
    const error = new Error("Scenario name contains illegal control characters or newlines");
    error.code = "INVALID_SCENARIO_NAME";
    throw error;
  }

  if (trimmed.length > 500) {
    const error = new Error("Scenario name exceeds maximum length of 500 characters");
    error.code = "INVALID_SCENARIO_NAME";
    throw error;
  }

  return trimmed;
}

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

export function computeFileHash(absolutePath) {
  try {
    const content = fs.readFileSync(absolutePath);
    return crypto.createHash("sha256").update(content).digest("hex");
  } catch {
    return null;
  }
}

async function writeJsonAtomic(repoRoot, relativePath, value) {
  assertSafeRepoPath(repoRoot, relativePath, "Runtime artifact path");
  const absolutePath = path.resolve(repoRoot, relativePath);
  const tempPath = `${absolutePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  await fsPromises.mkdir(path.dirname(absolutePath), { recursive: true, mode: 0o700 });
  await fsPromises.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await fsPromises.rename(tempPath, absolutePath);
}

export function computeTddCacheKey(identity) {
  return crypto.createHash("sha256").update(JSON.stringify(identity)).digest("hex");
}

export async function readTddCache(repoRoot, cacheKey) {
  const relativeCache = path.posix.join(TDD_RUNTIME_DIR, "cache", `${cacheKey}.json`);
  assertSafeRepoPath(repoRoot, relativeCache, "Cache path");
  const absoluteCache = path.resolve(repoRoot, relativeCache);
  try {
    const content = await fsPromises.readFile(absoluteCache, "utf8");
    const cached = JSON.parse(content);
    return { ...cached, cached: true };
  } catch {
    return null;
  }
}

export async function writeTddCache(repoRoot, cacheKey, result) {
  const relativeCache = path.posix.join(TDD_RUNTIME_DIR, "cache", `${cacheKey}.json`);
  await writeJsonAtomic(repoRoot, relativeCache, { ...result, cached: false });
}

export async function executeProcessDefault({
  command,
  args,
  cwd,
  env = process.env,
  timeoutMs = DEFAULT_TEST_TIMEOUT_MS,
  logPath,
  limits = {},
}) {
  const absoluteLogPath = path.resolve(cwd, logPath);
  await fsPromises.mkdir(path.dirname(absoluteLogPath), { recursive: true });

  const capturedChunks = [];
  let capturedBytes = 0;
  let outputTail = Buffer.alloc(0);
  let outputTruncated = false;
  const startedAt = Date.now();
  const maxLogBytes = limits.maxCheckLogBytes ?? 5242880;
  const maxSummaryLines = limits.maxFailureSummaryLines ?? 6;

  const child = spawn(command, args, {
    cwd,
    env,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  });

  function capture(chunk) {
    const buffer = Buffer.from(chunk);
    outputTail = Buffer.concat([outputTail, buffer]).subarray(-20000);
    const remaining = maxLogBytes - capturedBytes;
    if (remaining > 0) {
      const captured = buffer.subarray(0, remaining);
      capturedChunks.push(captured);
      capturedBytes += captured.length;
    }
    if (buffer.length > remaining) outputTruncated = true;
  }

  child.stdout?.on("data", capture);
  child.stderr?.on("data", capture);

  let timedOut = false;
  let forceKillTimeout;
  function signalProcessTree(signal) {
    const pid = child.pid;
    if (!pid) return;

    if (process.platform !== "win32") {
      try {
        process.kill(-pid, signal);
      } catch {
        try {
          process.kill(pid, signal);
        } catch {
          // Exited
        }
      }
    } else {
      try {
        process.kill(pid, signal);
      } catch {
        // Exited
      }
    }
  }

  const timeout = setTimeout(() => {
    timedOut = true;
    signalProcessTree("SIGTERM");
    forceKillTimeout = setTimeout(() => signalProcessTree("SIGKILL"), 1500);
  }, timeoutMs);

  const outcome = await new Promise((resolve) => {
    let settled = false;
    const finish = (val) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };
    child.on("error", (error) => finish({ exitCode: null, error }));
    child.on("close", (exitCode, signal) => finish({ exitCode, signal, error: null }));
  });

  clearTimeout(timeout);
  if (timedOut) signalProcessTree("SIGKILL");
  if (forceKillTimeout) clearTimeout(forceKillTimeout);

  const rawOutput = Buffer.concat(capturedChunks).toString("utf8");
  let safeLog = redactSecrets(rawOutput);
  if (outputTruncated) safeLog += "\n[delivery test runner truncated this log]\n";
  await fsPromises.writeFile(absoluteLogPath, safeLog, { flag: "w", mode: 0o600 });

  const durationMs = Date.now() - startedAt;
  const passed = !timedOut && !outcome.error && outcome.exitCode === 0;
  const safeTail = redactSecrets(outputTail.toString("utf8"));
  const summaryLines = passed
    ? []
    : summarizeFailureOutput(
        outcome.error?.message || safeTail || `Process exited with code ${outcome.exitCode ?? outcome.signal ?? "unknown"}`,
        maxSummaryLines
      );
  const locations = passed ? [] : extractLocations(safeTail || outcome.error?.message || "");

  return {
    passed,
    timedOut,
    exitCode: outcome.exitCode,
    error: outcome.error,
    durationMs,
    rawOutput,
    summaryLines,
    locations,
    logPath,
  };
}

export function findRelatedUnitTestsForSource(repoRoot, sourceFile) {
  const results = [];
  const normalized = normalizePath(sourceFile);
  const dir = path.posix.dirname(normalized);
  const ext = path.posix.extname(normalized);
  const base = path.posix.basename(normalized, ext);

  // 1. Check direct sibling test files
  const candidates = [
    path.posix.join(dir, `${base}.test.ts`),
    path.posix.join(dir, `${base}.test.tsx`),
    path.posix.join(dir, `${base}.test.js`),
    path.posix.join(dir, `${base}.test.mjs`),
    path.posix.join(dir, `${base}.spec.ts`),
    path.posix.join(dir, `${base}.spec.tsx`),
    path.posix.join("tools/delivery-mcp/test", `${base}.test.mjs`),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.resolve(repoRoot, candidate))) {
      results.push(candidate);
    }
  }

  // 2. Check TypeScript reverse dependencies from impact index if available
  try {
    const tsIndex = loadOrBuildTypeScriptImpactIndex({ repoRoot });
    const dependents = tsIndex?.reverseDependencies?.[normalized] || [];
    for (const dep of dependents) {
      if (getTestExtension(dep) && fs.existsSync(path.resolve(repoRoot, dep))) {
        if (!results.includes(dep)) {
          results.push(dep);
        }
      }
    }
  } catch {
    // Index lookup best effort
  }

  return results.sort();
}

export function findAffectedFeaturesForSteps(repoRoot, stepFiles) {
  const results = [];
  try {
    const impact = analyzeCucumberImpact({ repoRoot, files: stepFiles });
    if (impact?.affectedFeatureFiles && Array.isArray(impact.affectedFeatureFiles)) {
      results.push(...impact.affectedFeatureFiles);
    }
  } catch {
    // Best effort
  }

  if (results.length === 0) {
    try {
      const cukeIndex = loadOrBuildCucumberImpactIndex({ repoRoot });
      for (const stepFile of stepFiles) {
        const norm = normalizePath(stepFile);
        for (const [feat, featData] of Object.entries(cukeIndex?.features || {})) {
          if (featData?.stepFiles?.includes?.(norm) || featData?.matchedSteps?.some?.((s) => s.stepFile === norm)) {
            if (!results.includes(feat)) results.push(feat);
          }
        }
      }
    } catch {
      // Best effort
    }
  }

  return results.sort();
}

export async function testDelivery({
  repoRoot: customRepoRoot,
  mode = "affected",
  testFiles,
  featureFile,
  scenarioName,
  checkId,
  force = false,
  timeoutMs = DEFAULT_TEST_TIMEOUT_MS,
  executeFn = executeProcessDefault,
} = {}) {
  const repoRoot = findRepoRoot(customRepoRoot);

  if (!["affected", "unit", "scenario", "diagnostic"].includes(mode)) {
    return {
      status: "error",
      mode: mode || "unknown",
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

    // Cache lookup
    const fileHashes = {};
    for (const f of validatedFiles) {
      fileHashes[f] = computeFileHash(path.resolve(repoRoot, f));
    }
    const cacheKey = computeTddCacheKey({ mode: "unit", files: validatedFiles.sort(), fileHashes });

    if (!force) {
      const cached = await readTddCache(repoRoot, cacheKey);
      if (cached) return cached;
    }

    // Route to runner
    const allNodeTests = validatedFiles.every((f) => f.endsWith(".mjs") || f.startsWith("tools/"));
    let command;
    let args;
    if (allNodeTests) {
      command = "node";
      args = ["--test", "--test-concurrency=1", ...validatedFiles];
    } else {
      command = "npx";
      args = ["--no-install", "vitest", "run", ...validatedFiles];
    }

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
    const counts = parsed.found
      ? parsed.counts
      : execResult.passed
      ? { passed: validatedFiles.length, failed: 0, skipped: 0 }
      : { passed: 0, failed: validatedFiles.length, skipped: 0 };

    const status = execResult.passed ? "passed" : "failed";
    const failure = execResult.passed
      ? undefined
      : {
          message: redactSecrets(
            execResult.timedOut
              ? `Test execution timed out after ${timeoutMs}ms`
              : redactSecrets(execResult.summaryLines?.[0] || "Unit test execution failed")
          ),
          summaryLines: (execResult.summaryLines || []).map((l) => redactSecrets(l)),
          locations: execResult.locations || [],
          exitCode: execResult.exitCode ?? null,
        };

    const diagnostics = execResult.passed
      ? []
      : [
          {
            code: execResult.timedOut ? "CHECK_TIMEOUT" : "TEST_FAILED",
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
      ...(failure ? { failure } : {}),
      diagnostics,
    };

    await writeTddCache(repoRoot, cacheKey, result);
    return result;
  }

  // --- MODE: SCENARIO ---
  if (mode === "scenario") {
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

    const featureHash = computeFileHash(path.resolve(repoRoot, validatedFeatureFile));
    const cacheKey = computeTddCacheKey({
      mode: "scenario",
      featureFile: validatedFeatureFile,
      scenarioName: validatedScenarioName,
      featureHash,
    });

    if (!force) {
      const cached = await readTddCache(repoRoot, cacheKey);
      if (cached) return cached;
    }

    const command = "npx";
    const args = ["--no-install", "cucumber-js", validatedFeatureFile];
    if (validatedScenarioName) {
      args.push("--name", validatedScenarioName);
    }

    const logId = crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36);
    const logPath = path.posix.join(TDD_RUNTIME_DIR, "logs", `scenario-${logId}.log`);

    const execResult = await executeFn({
      command,
      args,
      cwd: repoRoot,
      env: {
        ...process.env,
        TS_NODE_PROJECT: "tsconfig.cucumber.json",
        APP_URL: process.env.APP_URL || "http://localhost:3000",
      },
      timeoutMs,
      logPath,
    });

    const parsed = parseTestCounts(execResult.rawOutput);
    const counts = parsed.found
      ? parsed.counts
      : execResult.passed
      ? { passed: 1, failed: 0, skipped: 0 }
      : { passed: 0, failed: 1, skipped: 0 };

    const status = execResult.passed ? "passed" : "failed";
    const failure = execResult.passed
      ? undefined
      : {
          message: redactSecrets(
            execResult.timedOut
              ? `Scenario execution timed out after ${timeoutMs}ms`
              : redactSecrets(execResult.summaryLines?.[0] || "Scenario execution failed")
          ),
          summaryLines: (execResult.summaryLines || []).map((l) => redactSecrets(l)),
          locations: execResult.locations || [],
          exitCode: execResult.exitCode ?? null,
        };

    const diagnostics = execResult.passed
      ? []
      : [
          {
            code: execResult.timedOut ? "CHECK_TIMEOUT" : "TEST_FAILED",
            message: failure.message,
            retryable: true,
          },
        ];

    const result = {
      status,
      mode: "scenario",
      durationMs: execResult.durationMs,
      cached: false,
      counts,
      ...(failure ? { failure } : {}),
      diagnostics,
    };

    await writeTddCache(repoRoot, cacheKey, result);
    return result;
  }

  // --- MODE: DIAGNOSTIC ---
  if (mode === "diagnostic") {
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

    // Check git snapshot/status hash for cache
    const statusRes = await runGit(["status", "--porcelain", "-z"], repoRoot);
    const gitStatusHash = crypto.createHash("sha256").update(statusRes.stdout).digest("hex");
    const cacheKey = computeTddCacheKey({ mode: "diagnostic", checkId, gitStatusHash });

    if (!force) {
      const cached = await readTddCache(repoRoot, cacheKey);
      if (cached) return cached;
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
        rawOutput: checkOutcome.summaryLines?.join("\n") || "",
      };
    }

    const parsed = parseTestCounts(execResult.rawOutput);
    const counts = parsed.found
      ? parsed.counts
      : execResult.passed
      ? { passed: 1, failed: 0, skipped: 0 }
      : { passed: 0, failed: 1, skipped: 0 };

    const status = execResult.passed ? "passed" : "failed";
    const failure = execResult.passed
      ? undefined
      : {
          message: redactSecrets(
            execResult.timedOut
              ? `Diagnostic check '${checkId}' timed out`
              : redactSecrets(execResult.summaryLines?.[0] || `Diagnostic check '${checkId}' failed`)
          ),
          summaryLines: (execResult.summaryLines || []).map((l) => redactSecrets(l)),
          locations: execResult.locations || [],
          exitCode: execResult.exitCode ?? null,
        };

    const diagnostics = execResult.passed
      ? []
      : [
          {
            code: execResult.timedOut ? "CHECK_TIMEOUT" : "DIAGNOSTIC_CHECK_FAILED",
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
      ...(failure ? { failure } : {}),
      diagnostics,
    };

    await writeTddCache(repoRoot, cacheKey, result);
    return result;
  }

  // --- MODE: AFFECTED ---
  const statusRes = await runGit(["status", "--porcelain", "-z"], repoRoot);
  const { staged, unstaged } = parsePorcelainStatus(statusRes.stdout);
  const allTrackedChanges = [...new Set([...staged.map((s) => s.file), ...unstaged.map((u) => u.file)])].filter(
    (f) => !f.startsWith(".delivery/runtime/") && !f.startsWith(".git/")
  );

  // 1. Working tree has no changes
  if (allTrackedChanges.length === 0) {
    return {
      status: "passed",
      mode: "affected",
      durationMs: 0,
      cached: false,
      counts: { passed: 0, failed: 0, skipped: 0 },
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
  const changedFeatures = allTrackedChanges.filter((f) => f.endsWith(".feature"));
  const changedSteps = allTrackedChanges.filter((f) => f.startsWith("features/") && f.endsWith(".ts"));
  const changedUnitTests = allTrackedChanges.filter((f) => getTestExtension(f) !== null);
  const changedProductionFiles = allTrackedChanges.filter(
    (f) => !f.startsWith("features/") && getTestExtension(f) === null && isProductionSourceFile(f)
  );
  const unmappedOrConfigFiles = allTrackedChanges.filter(
    (f) =>
      !f.endsWith(".feature") &&
      !f.startsWith("features/") &&
      getTestExtension(f) === null &&
      !isProductionSourceFile(f)
  );

  // Check cache for affected mode
  const workingTreeHash = crypto.createHash("sha256").update(statusRes.stdout).digest("hex");
  const cacheKey = computeTddCacheKey({
    mode: "affected",
    changedFiles: allTrackedChanges.sort(),
    workingTreeHash,
  });

  if (!force) {
    const cached = await readTddCache(repoRoot, cacheKey);
    if (cached) return cached;
  }

  // Resolve affected features
  const resolvedFeatures = new Set(changedFeatures);
  if (changedSteps.length > 0) {
    const fromSteps = findAffectedFeaturesForSteps(repoRoot, changedSteps);
    for (const feat of fromSteps) resolvedFeatures.add(feat);
  }

  // Resolve affected unit tests
  const resolvedUnitTests = new Set(changedUnitTests);
  for (const prodFile of changedProductionFiles) {
    const related = findRelatedUnitTestsForSource(repoRoot, prodFile);
    for (const test of related) resolvedUnitTests.add(test);
  }
  for (const otherFile of unmappedOrConfigFiles) {
    const related = findRelatedUnitTestsForSource(repoRoot, otherFile);
    for (const test of related) resolvedUnitTests.add(test);
  }

  // Check ambiguity
  const hasAmbiguousChange =
    (resolvedUnitTests.size === 0 && resolvedFeatures.size === 0) ||
    (changedProductionFiles.length > 0 && resolvedUnitTests.size === 0) ||
    unmappedOrConfigFiles.some((f) => f === "package.json" || f.startsWith("tsconfig") || f.includes(".delivery/policy"));

  if (resolvedUnitTests.size === 0 && resolvedFeatures.size === 0) {
    // Report clear diagnostic state
    const result = {
      status: "passed",
      mode: "affected",
      durationMs: 0,
      cached: false,
      counts: { passed: 0, failed: 0, skipped: 0 },
      diagnostics: [
        {
          code: "AMBIGUOUS_AFFECTED_SCOPE",
          message:
            "Changed files cannot be cleanly mapped to isolated tests. Run full diagnostic suite with mode: 'diagnostic', checkId: 'unit'",
          retryable: false,
        },
      ],
    };
    await writeTddCache(repoRoot, cacheKey, result);
    return result;
  }

  // Execute affected tests
  let totalDurationMs = 0;
  let overallStatus = "passed";
  const combinedCounts = { passed: 0, failed: 0, skipped: 0 };
  const allDiagnostics = [];
  let primaryFailure = undefined;

  // Run affected unit tests if any
  if (resolvedUnitTests.size > 0) {
    const unitResult = await testDelivery({
      repoRoot,
      mode: "unit",
      testFiles: [...resolvedUnitTests],
      force,
      timeoutMs,
      executeFn,
    });
    totalDurationMs += unitResult.durationMs || 0;
    combinedCounts.passed += unitResult.counts?.passed || 0;
    combinedCounts.failed += unitResult.counts?.failed || 0;
    combinedCounts.skipped += unitResult.counts?.skipped || 0;
    if (unitResult.diagnostics) allDiagnostics.push(...unitResult.diagnostics);
    if (unitResult.status !== "passed") {
      overallStatus = "failed";
      if (!primaryFailure && unitResult.failure) primaryFailure = unitResult.failure;
    }
  }

  // Run affected features if any
  if (resolvedFeatures.size > 0) {
    for (const feat of resolvedFeatures) {
      const featResult = await testDelivery({
        repoRoot,
        mode: "scenario",
        featureFile: feat,
        force,
        timeoutMs,
        executeFn,
      });
      totalDurationMs += featResult.durationMs || 0;
      combinedCounts.passed += featResult.counts?.passed || 0;
      combinedCounts.failed += featResult.counts?.failed || 0;
      combinedCounts.skipped += featResult.counts?.skipped || 0;
      if (featResult.diagnostics) allDiagnostics.push(...featResult.diagnostics);
      if (featResult.status !== "passed") {
        overallStatus = "failed";
        if (!primaryFailure && featResult.failure) primaryFailure = featResult.failure;
      }
    }
  }

  if (hasAmbiguousChange) {
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
    ...(primaryFailure ? { failure: primaryFailure } : {}),
    diagnostics: allDiagnostics,
  };

  await writeTddCache(repoRoot, cacheKey, result);
  return result;
}
