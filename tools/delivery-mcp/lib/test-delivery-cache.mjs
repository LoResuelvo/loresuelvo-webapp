import crypto from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { runGit } from "./git-snapshot.mjs";
import { loadDeliveryPolicy } from "./policy-loader.mjs";
import { assertSafeRepoPath } from "./repo-root.mjs";
import { normalizePath } from "./classify-files.mjs";
import { redactSecrets } from "./redact-secrets.mjs";
import { assertRealPathInsideRepo, assertExistingPathAncestorsInsideRepo } from "./test-delivery-scope.mjs";

export const TDD_RUNTIME_DIR = ".delivery/runtime/tdd";
const CACHE_VERSION = 1;
const BASE_ENVIRONMENT_VARIABLES = ["PATH", "CI", "NODE_ENV", "NODE_OPTIONS", "TZ"];
const SHA256 = /^[a-f0-9]{64}$/;
const countsSchema = z.object({
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
}).strict();
const diagnosticSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean(),
  file: z.string().optional(),
}).strict();
const failureSchema = z.object({
  signature: z.string(),
  code: z.string(),
  checkId: z.string(),
  message: z.string(),
  summaryLines: z.array(z.string()),
  locations: z.array(z.string()),
  logPath: z.string(),
  exitCode: z.number().int().nullable(),
}).strict();
const resultSchema = z.object({
  status: z.enum(["passed", "failed", "blocked", "error"]),
  mode: z.enum(["unit", "scenario", "diagnostic", "affected"]),
  durationMs: z.number().finite().nonnegative(),
  cached: z.literal(false),
  counts: countsSchema,
  diagnostics: z.array(diagnosticSchema),
  logPath: z.string().optional(),
  checkId: z.string().optional(),
  failure: failureSchema.optional(),
  selectedFeatureFiles: z.array(z.string()).optional(),
  selectedUnitTestFiles: z.array(z.string()).optional(),
  selectedCheckIds: z.array(z.string()).optional(),
}).strict();
const cacheSchema = z.object({
  version: z.literal(CACHE_VERSION),
  cacheKey: z.string().regex(SHA256),
  fingerprint: z.string().regex(SHA256),
  mode: z.enum(["unit", "scenario", "diagnostic", "affected"]),
  result: resultSchema,
}).strict();
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
export async function computeRepositoryInputFingerprint(
  repoRoot,
  { policyHash = null, environmentVariables = [] } = {}
) {
  let effectivePolicyHash = policyHash;
  let policyEnvironmentVariables = [];
  if (fs.existsSync(path.join(repoRoot, ".delivery/policy.v1.json"))) {
    const policy = await loadDeliveryPolicy({ repoRoot });
    effectivePolicyHash = policyHash ?? policy.sourceHash;
    // The worker validates a queued working-tree subject through this public
    // fingerprint API without check parameters. Include the policy-declared
    // union so enqueue and worker always identify the same subject.
    policyEnvironmentVariables = Object.values(policy.checkCatalog)
      .flatMap((definition) => definition.cacheEnv || []);
  }
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
    policyHash: effectivePolicyHash,
    environment: Object.fromEntries(
      [...new Set([...BASE_ENVIRONMENT_VARIABLES, ...policyEnvironmentVariables, ...environmentVariables])]
        .sort()
        .map((name) => [name, process.env[name] ?? ""])
    ),
    entries,
  };

  return {
    hash: computeTddCacheKey(identity),
    headSha,
    statusHash: identity.statusHash,
    errors,
  };
}

export function cacheInputErrorResult(mode, message, extra = {}) {
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

export async function readTddCache(repoRoot, cacheKey, { fingerprint, mode } = {}) {
  if (!SHA256.test(cacheKey) || !SHA256.test(fingerprint || "") || !mode) return null;
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
    const parsed = cacheSchema.safeParse(JSON.parse(content));
    if (!parsed.success) return null;
    const entry = parsed.data;
    if (entry.cacheKey !== cacheKey || entry.fingerprint !== fingerprint ||
        entry.mode !== mode || entry.result.mode !== mode) return null;
    return { ...entry.result, cached: true };
  } catch {
    return null;
  }
}

export async function writeTddCache(repoRoot, cacheKey, result, { fingerprint, mode } = {}) {
  const entry = cacheSchema.parse({
    version: CACHE_VERSION,
    cacheKey,
    fingerprint,
    mode,
    result: { ...result, cached: false },
  });
  const relativeCache = path.posix.join(TDD_RUNTIME_DIR, "cache", `${cacheKey}.json`);
  await writeJsonAtomic(repoRoot, relativeCache, entry);
}
