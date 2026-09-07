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
  computeFailureSignature,
} from "./execute-check.mjs";
import { parseDiagnostics } from "./parse-diagnostics.mjs";
import { parsePorcelainStatus, runGit } from "./git-snapshot.mjs";
import {
  loadOrBuildCucumberImpactIndex,
  findFeatureFiles,
  analyzeCucumberImpact,
} from "./impact-index.mjs";
import { loadOrBuildTypeScriptImpactIndex } from "./dependency-impact.mjs";
import { isProductionSourceFile, normalizePath } from "./classify-files.mjs";
import { createDeliveryJob, findActiveDeliveryJob, spawnJobWorker } from "./jobs.mjs";

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
const CACHE_INPUT_EXCLUDED_PREFIXES = [
  ".git/",
  "node_modules/",
  ".next/",
  "reports/",
  "coverage/",
  ".cucumber-dist/",
  ".turbo/",
  ".cache/",
  ".delivery/runtime/",
];
const CACHE_INPUT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".feature",
  ".gif",
  ".html",
  ".jpeg",
  ".jpg",
  ".js",
  ".json",
  ".jsx",
  ".mjs",
  ".png",
  ".scss",
  ".svg",
  ".ts",
  ".tsx",
  ".toml",
  ".txt",
  ".yaml",
  ".yml",
]);
const CACHE_INPUT_ROOT_FILES = new Set([
  "Makefile",
  ".env",
  ".env.local",
  ".env.development",
  ".env.test",
  ".env.production",
  ".npmrc",
  ".nvmrc",
]);
const TEST_EXECUTION_MODES = new Set(["sync", "job", "auto"]);

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

  try {
    const realPath = assertRealPathInsideRepo(repoRoot, absolutePath, "Test file path");
    if (!fs.statSync(realPath).isFile()) {
      const error = new Error(`Test file is not a regular file: ${filePath}`);
      error.code = "INVALID_TEST_FILE";
      throw error;
    }
  } catch (error) {
    if (!error.code) error.code = "INVALID_TEST_FILE";
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

  try {
    const realPath = assertRealPathInsideRepo(repoRoot, absolutePath, "Feature file path");
    if (!fs.statSync(realPath).isFile()) {
      const error = new Error(`Feature file is not a regular file: ${filePath}`);
      error.code = "INVALID_FEATURE_FILE";
      throw error;
    }
  } catch (error) {
    if (!error.code) error.code = "INVALID_FEATURE_FILE";
    throw error;
  }

  return normalized;
}

/**
 * Cucumber's `default` profile excludes @wip while its `wip` profile selects
 * only @wip scenarios.  Detect the tag attached to the requested scenario so
 * focused TDD can execute either kind through the managed build/server runner.
 */
export function scenarioHasWipTag(repoRoot, featureFile, scenarioName) {
  if (!scenarioName) return false;

  const absolutePath = path.resolve(repoRoot, featureFile);
  const source = fs.readFileSync(absolutePath, "utf8");
  let featureTags = [];
  let pendingTags = [];
  let seenFeature = false;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("@")) {
      pendingTags.push(...line.split(/\s+/).filter((tag) => tag.startsWith("@")));
      continue;
    }

    const featureMatch = line.match(/^Feature:\s*(.+)$/i);
    if (featureMatch) {
      featureTags = pendingTags;
      pendingTags = [];
      seenFeature = true;
      continue;
    }

    const scenarioMatch = line.match(/^(?:Scenario|Scenario Outline):\s*(.+)$/i);
    if (scenarioMatch) {
      const currentName = scenarioMatch[1].trim();
      const matches = seenFeature && currentName === scenarioName;
      const hasWip = featureTags.includes("@wip") || pendingTags.includes("@wip");
      pendingTags = [];
      if (matches) return hasWip;
      continue;
    }

    // Tags only apply to the immediately following Feature/Scenario/Rule.
    // Keep them across a `Rule:` heading, but never across a step or another
    // structural line.
    if (/^(?:Rule|Background):/i.test(line)) {
      pendingTags = [];
    } else if (!line.startsWith("|")) {
      pendingTags = [];
    }
  }

  return false;
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

  // The managed E2E runner receives the name as a fixed make variable. Keep
  // shell-expansion characters out of that value so a name can never turn
  // into command substitution or alter the recipe executed by make.
  if (/[\$`\\\"]/.test(trimmed)) {
    const error = new Error("Scenario name contains unsafe shell characters");
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
  assertExistingPathAncestorsInsideRepo(repoRoot, path.dirname(absolutePath), "Runtime artifact directory");
  if (fs.existsSync(absolutePath)) assertRealPathInsideRepo(repoRoot, absolutePath, "Runtime artifact path");
  await fsPromises.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await fsPromises.rename(tempPath, absolutePath);
}

export function computeTddCacheKey(identity) {
  return crypto.createHash("sha256").update(JSON.stringify(identity)).digest("hex");
}

function isPathInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/**
 * Resolve a user-controlled path before it is used as an input or as a log
 * destination.  assertSafeRepoPath protects against lexical traversal, but
 * a symlink can otherwise make an apparently safe path point outside the
 * repository.
 */
function assertRealPathInsideRepo(repoRoot, targetPath, label) {
  const realRepoRoot = fs.realpathSync(repoRoot);
  const realTarget = fs.realpathSync(targetPath);
  if (!isPathInside(realRepoRoot, realTarget)) {
    const error = new Error(`${label} resolves outside repository: ${targetPath}`);
    error.code = "PATH_OUTSIDE_REPO";
    throw error;
  }
  return realTarget;
}

function assertExistingPathAncestorsInsideRepo(repoRoot, targetPath, label) {
  let existing = targetPath;
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) break;
    existing = parent;
  }
  assertRealPathInsideRepo(repoRoot, existing, label);
  if (fs.existsSync(targetPath)) assertRealPathInsideRepo(repoRoot, targetPath, label);
}

function isCacheInputPath(relativePath) {
  const normalized = normalizePath(relativePath);
  if (isCacheInputExcluded(normalized)) {
    return false;
  }

  const baseName = path.posix.basename(normalized);
  if (CACHE_INPUT_ROOT_FILES.has(baseName) && !normalized.includes("/")) return true;

  const extension = path.posix.extname(normalized).toLowerCase();
  return CACHE_INPUT_EXTENSIONS.has(extension);
}

function isCacheInputExcluded(relativePath) {
  const normalized = normalizePath(relativePath);
  return CACHE_INPUT_EXCLUDED_PREFIXES.some((prefix) => {
    const directory = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
    return normalized === directory || normalized.startsWith(prefix);
  });
}

async function collectCacheInputFiles(repoRoot) {
  const files = [];

  async function visit(absoluteDirectory, relativeDirectory = "") {
    const entries = await fsPromises.readdir(absoluteDirectory, { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = normalizePath(
        relativeDirectory ? path.posix.join(relativeDirectory, entry.name) : entry.name
      );
      if (isCacheInputExcluded(relativePath)) {
        continue;
      }

      const absolutePath = path.resolve(repoRoot, relativePath);
      if (entry.isDirectory()) {
        await visit(absolutePath, relativePath);
      } else if ((entry.isFile() || entry.isSymbolicLink()) && isCacheInputPath(relativePath)) {
        files.push(relativePath);
      }
    }
  }

  await visit(repoRoot);
  return files.sort();
}

function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Build a content-based identity for all source, feature, step/support and
 * project configuration inputs.  A porcelain status hash alone is not enough:
 * editing a tracked source file leaves the path/status unchanged and would
 * otherwise allow a stale green TDD result to be reused.
 */
async function computeRepositoryInputFingerprint(repoRoot, { policyHash = null } = {}) {
  const headResult = await runGit(["rev-parse", "HEAD"], repoRoot);
  const statusResult = await runGit(["status", "--porcelain", "-z", "--untracked-files=all"], repoRoot);
  const headSha = headResult.error ? "NO_GIT_HEAD" : headResult.stdout.toString("utf8").trim();
  const statusValue = statusResult.error ? `GIT_STATUS_ERROR:${statusResult.error.message || "unknown"}` : statusResult.stdout;
  const inputFiles = await collectCacheInputFiles(repoRoot);
  const entries = [];
  const errors = [];

  for (const relativePath of inputFiles) {
    const absolutePath = path.resolve(repoRoot, relativePath);
    try {
      const realPath = assertRealPathInsideRepo(repoRoot, absolutePath, "Cache input");
      const content = await fsPromises.readFile(realPath);
      entries.push({ path: relativePath, hash: hashBuffer(content) });
    } catch (error) {
      // A file can disappear between readdir and readFile. Keep that state in
      // the identity so it cannot accidentally reuse a prior result; symlinks
      // escaping the repository are reported to the caller and fail closed.
      errors.push(error.message);
      entries.push({ path: relativePath, hash: `UNREADABLE:${error.code || error.message}` });
    }
  }

  const identity = {
    headSha,
    statusHash: hashBuffer(Buffer.isBuffer(statusValue) ? statusValue : Buffer.from(statusValue)),
    policyHash,
    environment: {
      NODE_ENV: process.env.NODE_ENV || "",
      APP_URL: process.env.APP_URL || "",
      TEST_PORT: process.env.TEST_PORT || "",
      TS_NODE_PROJECT: process.env.TS_NODE_PROJECT || "",
    },
    entries,
  };

  return {
    hash: computeTddCacheKey(identity),
    headSha,
    statusHash: identity.statusHash,
    errors,
  };
}

function cacheInputErrorResult(mode, message, extra = {}) {
  return {
    status: "error",
    mode,
    cached: false,
    durationMs: 0,
    counts: { passed: 0, failed: 0, skipped: 0 },
    diagnostics: [
      {
        code: "CACHE_INPUT_ERROR",
        message: redactSecrets(message),
        retryable: true,
      },
    ],
    ...extra,
  };
}

/**
 * Decide whether a delivery_test invocation should be detached into the
 * recoverable job runner. The functional `mode` intentionally stays
 * independent from the transport/execution mode. Focused unit tests are
 * kept synchronous in `auto`; affected and scenario runs can fan out into
 * several checks, while diagnostic checks are detached only when the policy
 * declares a timeout longer than the normal focused-test budget.
 */
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

function queuedTestResult({ mode, executionMode, jobId, status = "job_started", message }) {
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
}) {
  const runKey = `delivery-test-${cacheKey}`;
  const activeJob = await findActiveDeliveryJob({ repoRoot, runKey });
  if (activeJob) {
    return queuedTestResult({
      mode,
      executionMode: "job",
      jobId: activeJob.jobId,
      status: "running",
      message: `delivery_test job '${activeJob.jobId}' is already running. Use delivery_job_wait to await completion.`,
    });
  }

  const job = await createDeliveryJob({
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
    snapshotHash: inputFingerprint?.hash || null,
    gateId: `TEST_${mode}`,
  });

  await spawnJobWorker({ repoRoot, jobId: job.jobId });
  return queuedTestResult({
    mode,
    executionMode: "job",
    jobId: job.jobId,
    message: `delivery_test '${mode}' started as recoverable background job '${job.jobId}'. Use delivery_job_wait to await completion.`,
  });
}

export async function readTddCache(repoRoot, cacheKey) {
  const relativeCache = path.posix.join(TDD_RUNTIME_DIR, "cache", `${cacheKey}.json`);
  assertSafeRepoPath(repoRoot, relativeCache, "Cache path");
  const absoluteCache = path.resolve(repoRoot, relativeCache);
  try {
    assertExistingPathAncestorsInsideRepo(repoRoot, absoluteCache, "Cache path");
  } catch {
    return null;
  }
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
  assertSafeRepoPath(cwd, logPath, "Log path");
  const absoluteLogPath = path.resolve(cwd, logPath);
  await fsPromises.mkdir(path.dirname(absoluteLogPath), { recursive: true });
  assertRealPathInsideRepo(cwd, path.dirname(absoluteLogPath), "Log directory");
  if (fs.existsSync(absoluteLogPath)) {
    assertRealPathInsideRepo(cwd, absoluteLogPath, "Log path");
  }

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

  const capturedOutput = Buffer.concat(capturedChunks).toString("utf8");
  const rawOutputTail = outputTail.toString("utf8");
  const safeCapturedOutput = redactSecrets(capturedOutput);
  const safeOutputTail = redactSecrets(rawOutputTail);
  const safeLog = outputTruncated
    ? `${safeCapturedOutput}\n[delivery test runner truncated this log]\n[delivery test runner output tail]\n${safeOutputTail}`
    : safeCapturedOutput;
  await fsPromises.writeFile(absoluteLogPath, safeLog, { flag: "w", mode: 0o600 });

  const durationMs = Date.now() - startedAt;
  const passed = !timedOut && !outcome.error && outcome.exitCode === 0 && !outcome.signal;
  const parsedDiag = parseDiagnostics({
    command,
    args,
    output: safeCapturedOutput,
    outputTail: safeOutputTail,
    outputTruncated,
    exitCode: outcome.exitCode,
    signal: outcome.signal,
    timedOut,
    error: outcome.error,
    maxSummaryLines,
    maxLocations: maxSummaryLines,
  });

  const summaryLines = passed ? [] : parsedDiag.summaryLines;
  const locations = passed ? [] : parsedDiag.locations;

  return {
    passed,
    timedOut,
    exitCode: outcome.exitCode,
    error: outcome.error,
    durationMs,
    rawOutput: outputTruncated ? `${capturedOutput}\n${rawOutputTail}` : capturedOutput,
    outputTail: rawOutputTail,
    outputTruncated,
    summaryLines,
    locations,
    counts: parsedDiag.counts,
    code: parsedDiag.code,
    message: parsedDiag.message,
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
      const cached = await readTddCache(repoRoot, cacheKey);
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
      const cached = await readTddCache(repoRoot, cacheKey);
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
      const cached = await readTddCache(repoRoot, cacheKey);
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

    await writeTddCache(repoRoot, cacheKey, result);
    return result;
  }

  // --- MODE: AFFECTED ---
  const statusRes = await runGit(["status", "--porcelain", "-z", "--untracked-files=all"], repoRoot);
  if (statusRes.error) {
    return {
      status: "error",
      mode: "affected",
      durationMs: 0,
      cached: false,
      counts: { passed: 0, failed: 0, skipped: 0 },
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
  const changedSteps = allChangedFiles.filter((f) => f.startsWith("features/") && f.endsWith(".ts"));
  const changedUnitTests = allChangedFiles.filter((f) => getTestExtension(f) !== null);
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
    const cached = await readTddCache(repoRoot, cacheKey);
    if (cached) return cached;
  }

  // Check ambiguity
  const hasAmbiguousChange =
    (resolvedUnitTests.size === 0 && resolvedFeatures.size === 0) ||
    (changedProductionFiles.length > 0 && resolvedUnitTests.size === 0) ||
    unmappedOrConfigFiles.some((f) => f === "package.json" || f.startsWith("tsconfig") || f.includes(".delivery/policy"));

  if (resolvedUnitTests.size === 0 && resolvedFeatures.size === 0) {
    // Report clear diagnostic state
    const result = {
      status: "blocked",
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
    });
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
    ...(primaryFailure ? { failure: primaryFailure } : {}),
    diagnostics: allDiagnostics,
  };

  await writeTddCache(repoRoot, cacheKey, result);
  return result;
}
