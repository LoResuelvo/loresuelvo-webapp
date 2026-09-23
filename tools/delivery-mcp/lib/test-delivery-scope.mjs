import fs from "node:fs";
import path from "node:path";
import { assertSafeRepoPath } from "./repo-root.mjs";
import { normalizePath } from "./classify-files.mjs";
import { analyzeCucumberImpact } from "./impact-index.mjs";
import { loadOrBuildTypeScriptImpactIndex } from "./dependency-impact.mjs";

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
export function assertRealPathInsideRepo(repoRoot, targetPath, label) {
  const realRepoRoot = fs.realpathSync(repoRoot);
  const realTarget = fs.realpathSync(targetPath);
  if (!isPathInside(realRepoRoot, realTarget)) {
    const error = new Error(`${label} resolves outside repository: ${targetPath}`);
    error.code = "PATH_OUTSIDE_REPO";
    throw error;
  }
  return realTarget;
}

export function assertExistingPathAncestorsInsideRepo(repoRoot, targetPath, label) {
  let existing = targetPath;
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) break;
    existing = parent;
  }
  assertRealPathInsideRepo(repoRoot, existing, label);
  if (fs.existsSync(targetPath)) assertRealPathInsideRepo(repoRoot, targetPath, label);
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

export function resolveAffectedFeaturesForSteps(repoRoot, stepFiles) {
  try {
    const impact = analyzeCucumberImpact({ repoRoot, files: stepFiles });
    return {
      featureFiles: [...new Set(impact.affectedFeatureFiles || [])].sort(),
      gate: impact.gate,
      confidence: impact.confidence,
      reasonCodes: [...(impact.reasonCodes || [])],
    };
  } catch (error) {
    return {
      featureFiles: [],
      gate: "C",
      confidence: "low",
      reasonCodes: ["AMBIGUOUS_STEP_IMPACT"],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function findAffectedFeaturesForSteps(repoRoot, stepFiles) {
  return resolveAffectedFeaturesForSteps(repoRoot, stepFiles).featureFiles;
}
