import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  CucumberExpression,
  RegularExpression,
  ParameterTypeRegistry,
} from "@cucumber/cucumber-expressions";
import { normalizePath } from "./classify-files.mjs";
import {
  CUCUMBER_HEAD_INDEX_PATH,
  CUCUMBER_IMPACT_INDEX_PATH,
  CUCUMBER_IMPACT_SCHEMA_VERSION,
  computeIndexFingerprint,
  getGitHeadIdentity,
  listGitHeadFiles,
  readGitHeadFile,
  sha256,
  writeIndexAtomically,
} from "./cucumber-index-storage.mjs";
import { findRepoRoot } from "./repo-root.mjs";

export { CUCUMBER_IMPACT_INDEX_PATH } from "./cucumber-index-storage.mjs";

export const SUPPORTED_CUCUMBER_STEP_EXTENSIONS = Object.freeze([".ts"]);

const STEP_KEYWORD_REGEX = /^\s*(Given|When|Then|And|But|Dado|Cuando|Entonces|Y|Pero)\s+(.+)$/;
const SCENARIO_REGEX = /^\s*(?:Scenario|Scenario Outline|Escenario|Esquema del escenario):\s*(.+)$/i;
const FEATURE_REGEX = /^\s*Feature:\s*(.+)$/i;
const BACKGROUND_REGEX = /^\s*Background:/i;
const SOURCE_FILE_REGEX = /\.(ts|tsx|js|mjs|cjs)$/;
const IMPORT_REGEX = /(?:import|export)\s+(?:[\s\S]*?from\s+)?["'](\.[^"']+)["']|require\s*\(\s*["'](\.[^"']+)["']\s*\)/g;

export function computeFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return sha256(content);
  } catch {
    return null;
  }
}

export function findFeatureFiles(dir, repoRoot) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFeatureFiles(full, repoRoot));
    } else if (entry.name.endsWith(".feature")) {
      results.push(normalizePath(path.relative(repoRoot, full)));
    }
  }
  return results.sort();
}

export function findStepFiles(dir, repoRoot) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "support") {
        results.push(...findStepFiles(full, repoRoot));
      }
    } else if (
      SUPPORTED_CUCUMBER_STEP_EXTENSIONS.includes(path.extname(entry.name)) &&
      !entry.name.endsWith(".d.ts")
    ) {
      results.push(normalizePath(path.relative(repoRoot, full)));
    }
  }
  return results.sort();
}

export function findReachableSupportFiles(repoRoot) {
  const supportDir = path.resolve(repoRoot, "features", "support");
  if (!fs.existsSync(supportDir)) {
    return { supportFiles: [], reachableFiles: [] };
  }

  const supportFiles = [];
  const reachableFiles = new Set();
  const queue = [];

  function collectSupport(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectSupport(full);
      } else if (SOURCE_FILE_REGEX.test(entry.name)) {
        const rel = normalizePath(path.relative(repoRoot, full));
        supportFiles.push(rel);
        reachableFiles.add(rel);
        queue.push(full);
      }
    }
  }

  collectSupport(supportDir);

  const visited = new Set(queue);

  while (queue.length > 0) {
    const currentPath = queue.shift();
    let content = "";
    try {
      content = fs.readFileSync(currentPath, "utf8");
    } catch {
      continue;
    }

    let match;
    while ((match = IMPORT_REGEX.exec(content)) !== null) {
      const specifier = match[1] || match[2];
      if (!specifier) continue;

      const currentDir = path.dirname(currentPath);
      const targetBase = path.resolve(currentDir, specifier);
      const candidates = [
        targetBase,
        `${targetBase}.ts`,
        `${targetBase}.tsx`,
        `${targetBase}.js`,
        `${targetBase}.mjs`,
        `${targetBase}.cjs`,
        `${targetBase}.d.ts`,
        path.join(targetBase, "index.ts"),
        path.join(targetBase, "index.js"),
      ];

      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          let isFile = false;
          try {
            isFile = fs.statSync(cand).isFile();
          } catch {
            isFile = false;
          }
          if (isFile) {
            const rel = normalizePath(path.relative(repoRoot, cand));
            if (!rel.startsWith("..") && !rel.includes("node_modules")) {
              reachableFiles.add(rel);
              if (!visited.has(cand)) {
                visited.add(cand);
                queue.push(cand);
              }
            }
            break;
          }
        }
      }
    }
  }

  return {
    supportFiles: supportFiles.sort(),
    reachableFiles: [...reachableFiles].sort(),
  };
}

function importedFileCandidates(currentFile, specifier) {
  const targetBase = path.posix.normalize(path.posix.join(path.posix.dirname(currentFile), specifier));
  return [
    targetBase,
    `${targetBase}.ts`,
    `${targetBase}.tsx`,
    `${targetBase}.js`,
    `${targetBase}.mjs`,
    `${targetBase}.cjs`,
    `${targetBase}.d.ts`,
    path.posix.join(targetBase, "index.ts"),
    path.posix.join(targetBase, "index.js"),
  ];
}

function findReachableSupportFilesInSnapshot({ allFiles, readFile }) {
  const availableFiles = new Set(allFiles.map(normalizePath));
  const supportFiles = [...availableFiles]
    .filter((file) => file.startsWith("features/support/") && SOURCE_FILE_REGEX.test(file))
    .sort();
  const reachableFiles = new Set(supportFiles);
  const queue = [...supportFiles];

  while (queue.length > 0) {
    const currentFile = queue.shift();
    const content = readFile(currentFile);
    if (content === null) continue;

    let match;
    while ((match = IMPORT_REGEX.exec(content)) !== null) {
      const specifier = match[1] || match[2];
      if (!specifier) continue;

      const importedFile = importedFileCandidates(currentFile, specifier).find((candidate) =>
        availableFiles.has(candidate)
      );
      if (importedFile && !reachableFiles.has(importedFile)) {
        reachableFiles.add(importedFile);
        queue.push(importedFile);
      }
    }
  }

  return {
    supportFiles,
    reachableFiles: [...reachableFiles].sort(),
  };
}

export function extractStepsFromFeature(content, featureFile) {
  const steps = [];
  const lines = content.split(/\r?\n/);
  let currentScenario = "Background";
  let inDocstring = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
      inDocstring = !inDocstring;
      continue;
    }
    if (inDocstring) continue;

    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("@")) {
      continue;
    }

    const scenarioMatch = trimmed.match(SCENARIO_REGEX);
    if (scenarioMatch) {
      currentScenario = scenarioMatch[1].trim();
      continue;
    }

    if (BACKGROUND_REGEX.test(trimmed)) {
      currentScenario = "Background";
      continue;
    }

    if (trimmed.startsWith("|")) {
      continue;
    }

    const stepMatch = trimmed.match(STEP_KEYWORD_REGEX);
    if (stepMatch) {
      const keyword = stepMatch[1];
      const text = stepMatch[2].trim();
      steps.push({
        keyword,
        text,
        featureFile,
        scenario: currentScenario,
        line: lineNumber,
      });
    }
  }

  return steps;
}

export function extractStepDefinitionsFromSource(content, filePath) {
  const definitions = [];

  const lineStarts = [0];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "\n") lineStarts.push(i + 1);
  }

  function getLineNumber(charIndex) {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (lineStarts[mid] <= charIndex) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return high + 1;
  }

  const keywordRegex = /\b(Given|When|Then|defineStep)\s*\(/g;
  let match;

  while ((match = keywordRegex.exec(content)) !== null) {
    const keyword = match[1];
    let idx = keywordRegex.lastIndex;

    // Check if within a single-line comment on the same line
    const matchLineIndex = getLineNumber(match.index) - 1;
    const lineStartPos = lineStarts[matchLineIndex];
    const lineBefore = content.slice(lineStartPos, match.index);
    if (lineBefore.includes("//")) {
      continue;
    }

    while (idx < content.length && /\s/.test(content[idx])) idx++;
    if (idx >= content.length) break;

    const startChar = content[idx];
    let pattern = null;
    let patternType = null;
    let regexFlags = "";
    let ambiguous = false;

    if (startChar === '"' || startChar === "'" || startChar === "`") {
      patternType = "cucumber_expression";
      const quote = startChar;
      idx++;
      let str = "";
      let escaped = false;
      while (idx < content.length) {
        const c = content[idx];
        if (escaped) {
          str += c;
          escaped = false;
        } else if (c === "\\") {
          escaped = true;
          str += c;
        } else if (c === quote) {
          idx++;
          break;
        } else {
          str += c;
        }
        idx++;
      }
      pattern = str;
    } else if (startChar === "/") {
      patternType = "regex";
      idx++;
      let str = "";
      let escaped = false;
      while (idx < content.length) {
        const c = content[idx];
        if (escaped) {
          str += c;
          escaped = false;
        } else if (c === "\\") {
          escaped = true;
          str += c;
        } else if (c === "/") {
          idx++;
          break;
        } else {
          str += c;
        }
        idx++;
      }
      while (idx < content.length && /[a-z]/i.test(content[idx])) {
        regexFlags += content[idx];
        idx++;
      }
      pattern = str;
    } else {
      pattern = "DYNAMIC_STEP_ARGUMENT";
      patternType = "ambiguous";
      ambiguous = true;
    }

    const line = getLineNumber(match.index);
    definitions.push({
      id: `${filePath}:${line}:${pattern}`,
      keyword,
      pattern,
      patternType,
      regexFlags,
      file: filePath,
      line,
      ambiguous,
      consumers: [],
      consumerFeatures: [],
    });
  }

  return definitions;
}

export function matchDefinitionsAgainstFeatureSteps(stepDefinitions, allSteps) {
  const registry = new ParameterTypeRegistry();
  for (const def of stepDefinitions) {
    def.consumers = [];
    def.consumerFeatures = [];
    let compiled = null;
    if (!def.ambiguous) {
      try {
        if (def.patternType === "cucumber_expression") {
          compiled = new CucumberExpression(def.pattern, registry);
        } else if (def.patternType === "regex") {
          compiled = new RegularExpression(new RegExp(def.pattern, def.regexFlags), registry);
        }
      } catch {
        def.ambiguous = true;
      }
    }

    if (compiled) {
      const consumerFeaturesSet = new Set();
      for (const step of allSteps) {
        try {
          const match = compiled.match(step.text);
          if (match !== null) {
            def.consumers.push({
              featureFile: step.featureFile,
              scenario: step.scenario,
              line: step.line,
              stepText: step.text,
            });
            consumerFeaturesSet.add(step.featureFile);
          }
        } catch {
          def.ambiguous = true;
        }
      }
      def.consumerFeatures = [...consumerFeaturesSet].sort();
    }
  }
}

function buildCucumberIndex({
  featureFiles,
  stepFiles,
  supportFiles,
  reachableSupportFiles,
  readFile,
  identity,
}) {
  const fileHashes = {};
  const indexedFiles = new Set([...featureFiles, ...stepFiles, ...reachableSupportFiles]);
  for (const file of indexedFiles) {
    const content = readFile(file);
    if (content !== null) fileHashes[file] = sha256(content);
  }

  const allSteps = [];
  const scenarioNames = new Set();
  for (const file of featureFiles) {
    const content = readFile(file);
    if (content === null) continue;
    const steps = extractStepsFromFeature(content, file);
    for (const step of steps) {
      allSteps.push(step);
      scenarioNames.add(`${step.featureFile}#${step.scenario}`);
    }
  }

  const stepDefinitions = [];
  for (const file of stepFiles) {
    const content = readFile(file);
    if (content === null) continue;
    stepDefinitions.push(...extractStepDefinitionsFromSource(content, file));
  }

  matchDefinitionsAgainstFeatureSteps(stepDefinitions, allSteps);

  return {
    schemaVersion: CUCUMBER_IMPACT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    identity: {
      ...identity,
      fingerprint: computeIndexFingerprint(fileHashes),
    },
    fileHashes,
    featureFiles,
    stepFiles,
    supportFiles,
    reachableSupportFiles,
    stepDefinitions,
    summary: {
      totalFeatures: featureFiles.length,
      totalScenarios: scenarioNames.size,
      totalSteps: allSteps.length,
      totalStepDefinitions: stepDefinitions.length,
      totalSupportFiles: supportFiles.length,
      totalReachableSupportFiles: reachableSupportFiles.length,
    },
  };
}

function readWorkingTreeFile(repoRoot, relativePath) {
  try {
    return fs.readFileSync(path.resolve(repoRoot, relativePath), "utf8");
  } catch {
    return null;
  }
}

function buildHeadCucumberImpactIndex(repoRoot) {
  const identity = getGitHeadIdentity(repoRoot);
  const allFiles = listGitHeadFiles(repoRoot);
  const fileContents = new Map();
  const featureFiles = allFiles.filter(
    (file) => file.startsWith("features/") && file.endsWith(".feature")
  );
  const stepFiles = allFiles.filter(
    (file) =>
      file.startsWith("features/") &&
      !file.startsWith("features/support/") &&
      file.endsWith(".ts") &&
      !file.endsWith(".d.ts")
  );
  const readFile = (file) => {
    if (!fileContents.has(file)) {
      fileContents.set(file, readBaseFileFromGit(repoRoot, file));
    }
    return fileContents.get(file);
  };
  const { supportFiles, reachableFiles } = findReachableSupportFilesInSnapshot({
    allFiles,
    readFile,
  });

  return buildCucumberIndex({
    featureFiles,
    stepFiles,
    supportFiles,
    reachableSupportFiles: reachableFiles,
    readFile,
    identity: { source: "head", ...identity },
  });
}

export function buildCucumberImpactIndex({ repoRoot = findRepoRoot() } = {}) {
  const root = path.resolve(repoRoot);
  const featuresDir = path.join(root, "features");
  const featureFiles = findFeatureFiles(featuresDir, root);
  const stepFiles = findStepFiles(featuresDir, root);
  const { supportFiles, reachableFiles } = findReachableSupportFiles(root);
  const identity = getGitHeadIdentity(root);
  const index = buildCucumberIndex({
    featureFiles,
    stepFiles,
    supportFiles,
    reachableSupportFiles: reachableFiles,
    readFile: (file) => readWorkingTreeFile(root, file),
    identity: { source: "working_tree", ...identity },
  });

  const targetPath = path.resolve(root, CUCUMBER_IMPACT_INDEX_PATH);
  writeIndexAtomically(targetPath, index);

  return index;
}

function isCucumberImpactIndex(index) {
  const summaryFields = [
    "totalFeatures",
    "totalScenarios",
    "totalSteps",
    "totalStepDefinitions",
    "totalSupportFiles",
    "totalReachableSupportFiles",
  ];
  const hasValidSummary = summaryFields.every((field) => Number.isInteger(index?.summary?.[field]));
  const hasValidFileHashes =
    index?.fileHashes &&
    !Array.isArray(index.fileHashes) &&
    Object.values(index.fileHashes).every((hash) => /^[a-f0-9]{64}$/.test(hash));

  return Boolean(
    index &&
      index.schemaVersion === CUCUMBER_IMPACT_SCHEMA_VERSION &&
      typeof index.generatedAt === "string" &&
      index.identity &&
      ["head", "working_tree"].includes(index.identity.source) &&
      typeof index.identity.branch === "string" &&
      index.identity.branch.length > 0 &&
      /^[a-f0-9]{40,64}$/.test(index.identity.headSha) &&
      /^[a-f0-9]{40,64}$/.test(index.identity.headTree) &&
      /^[a-f0-9]{64}$/.test(index.identity.fingerprint) &&
      hasValidFileHashes &&
      Array.isArray(index.featureFiles) &&
      Array.isArray(index.stepFiles) &&
      Array.isArray(index.supportFiles) &&
      Array.isArray(index.reachableSupportFiles) &&
      Array.isArray(index.stepDefinitions) &&
      hasValidSummary
  );
}

function hasExpectedHeadIdentity(index, headIdentity) {
  return (
    index.identity.branch === headIdentity.branch &&
    index.identity.headSha === headIdentity.headSha &&
    index.identity.headTree === headIdentity.headTree
  );
}

function loadOrBuildHeadCucumberImpactIndex(repoRoot) {
  const targetPath = path.resolve(repoRoot, CUCUMBER_HEAD_INDEX_PATH);
  const headIdentity = getGitHeadIdentity(repoRoot);

  if (fs.existsSync(targetPath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(targetPath, "utf8"));
      if (
        isCucumberImpactIndex(cached) &&
        cached.identity.source === "head" &&
        hasExpectedHeadIdentity(cached, headIdentity) &&
        cached.identity.fingerprint === computeIndexFingerprint(cached.fileHashes)
      ) {
        return cached;
      }
    } catch {
      // Partial, corrupt, or incompatible cache -> rebuild from immutable HEAD blobs.
    }
  }

  const index = buildHeadCucumberImpactIndex(repoRoot);
  writeIndexAtomically(targetPath, index);
  return index;
}

export function isCacheValid({ repoRoot, cachedIndex }) {
  if (!isCucumberImpactIndex(cachedIndex) || cachedIndex.identity.source !== "working_tree") {
    return false;
  }

  const root = path.resolve(repoRoot);
  let headIdentity;
  try {
    headIdentity = getGitHeadIdentity(root);
  } catch {
    return false;
  }
  if (!hasExpectedHeadIdentity(cachedIndex, headIdentity)) return false;
  if (cachedIndex.identity.fingerprint !== computeIndexFingerprint(cachedIndex.fileHashes)) {
    return false;
  }

  for (const [relPath, expectedHash] of Object.entries(cachedIndex.fileHashes)) {
    const fullPath = path.resolve(root, relPath);
    if (!fs.existsSync(fullPath)) return false;
    const currentHash = computeFileHash(fullPath);
    if (currentHash !== expectedHash) return false;
  }

  // Verify no new feature, step, or support files have appeared
  const featuresDir = path.join(root, "features");
  const currentFeatures = findFeatureFiles(featuresDir, root);
  const currentStepFiles = findStepFiles(featuresDir, root);
  const { reachableFiles } = findReachableSupportFiles(root);

  for (const file of currentFeatures) {
    if (!cachedIndex.fileHashes[file]) return false;
  }
  for (const file of currentStepFiles) {
    if (!cachedIndex.fileHashes[file]) return false;
  }
  for (const file of reachableFiles) {
    if (!cachedIndex.fileHashes[file]) return false;
  }

  return true;
}

export function loadOrBuildCucumberImpactIndex({ repoRoot = findRepoRoot(), force = false } = {}) {
  const root = path.resolve(repoRoot);
  const targetPath = path.resolve(root, CUCUMBER_IMPACT_INDEX_PATH);

  if (!force && fs.existsSync(targetPath)) {
    try {
      const raw = fs.readFileSync(targetPath, "utf8");
      const cached = JSON.parse(raw);
      if (isCacheValid({ repoRoot: root, cachedIndex: cached })) {
        return cached;
      }
    } catch {
      // Invalid JSON or reading error -> regenerate
    }
  }

  return buildCucumberImpactIndex({ repoRoot: root });
}

export function isStepDefinitionFile(file, index) {
  const norm = normalizePath(file);
  const hasSupportedExtension = SUPPORTED_CUCUMBER_STEP_EXTENSIONS.includes(
    path.posix.extname(norm)
  );
  if (norm.startsWith("features/support/")) return false;
  if (index?.stepFiles?.includes(norm)) return true;
  if (!hasSupportedExtension || norm.endsWith(".d.ts")) return false;
  if (norm.startsWith("features/")) return true;
  if (norm.includes("step_definitions/")) return true;
  if (norm.includes("_steps.") || norm.includes(".steps.")) return true;
  return false;
}

export function isCucumberSupportFile(file, index) {
  const norm = normalizePath(file);
  if (norm.startsWith("features/support/")) return true;
  if (index?.supportFiles?.includes(norm)) return true;
  if (index?.reachableSupportFiles?.includes(norm)) return true;
  return false;
}

export function isSameStepDefinition(a, b) {
  if (!a || !b) return false;
  return (
    normalizePath(a.file) === normalizePath(b.file) &&
    a.pattern === b.pattern &&
    a.patternType === b.patternType &&
    (a.regexFlags || "") === (b.regexFlags || "")
  );
}

export function isFileInGitHead(repoRoot, relativePath) {
  try {
    execFileSync("git", ["cat-file", "-e", `HEAD:${relativePath}`], {
      cwd: repoRoot,
      stdio: ["pipe", "pipe", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

export function readBaseFileFromGit(repoRoot, relativePath) {
  return readGitHeadFile(repoRoot, relativePath);
}

export function getBaseCucumberIndex({ repoRoot, baseIndex = null }) {
  const root = path.resolve(repoRoot);
  if (baseIndex?.corrupt) return baseIndex;

  try {
    const headIndex = loadOrBuildHeadCucumberImpactIndex(root);
    if (!baseIndex) return headIndex;
    if (!isCucumberImpactIndex(baseIndex)) return { corrupt: true };
    if (!hasExpectedHeadIdentity(baseIndex, headIndex.identity)) return { corrupt: true };
    if (baseIndex.identity.fingerprint !== headIndex.identity.fingerprint) {
      return { corrupt: true };
    }
    return headIndex;
  } catch {
    return { corrupt: true };
  }
}

/**
 * @typedef {object} CucumberImpactResult
 * @property {"0"|"B"|"C"|"NONE"} gate
 * @property {string[]} reasonCodes
 * @property {number} consumerCount
 * @property {number} affectedFeatures
 * @property {string[]} affectedFeatureFiles
 * @property {"high"|"low"} confidence
 * @property {{ featureFile: string }=} parameters
 */

/**
 * Keep the count and the auditable feature identities on the same contract.
 * @returns {CucumberImpactResult}
 */
function cucumberImpactResult({
  gate,
  reasonCodes,
  consumerCount,
  affectedFeatureFiles = [],
  confidence,
  parameters,
}) {
  const normalizedFeatureFiles = [
    ...new Set(affectedFeatureFiles.map((file) => normalizePath(file))),
  ].sort();
  return {
    gate,
    reasonCodes,
    consumerCount,
    affectedFeatures: normalizedFeatureFiles.length,
    affectedFeatureFiles: normalizedFeatureFiles,
    confidence,
    ...(parameters ? { parameters } : {}),
  };
}

export function analyzeCucumberImpact({
  repoRoot = findRepoRoot(),
  files = [],
  index = null,
  baseIndex = null,
  force = false,
} = {}) {
  const root = path.resolve(repoRoot);
  const normalizedFiles = files.map(normalizePath);

  const effBaseIndex = getBaseCucumberIndex({ repoRoot: root, baseIndex });
  if (effBaseIndex?.corrupt) {
    return cucumberImpactResult({
      gate: "C",
      reasonCodes: ["AMBIGUOUS_STEP_IMPACT"],
      consumerCount: 0,
      confidence: "low",
    });
  }
  const impactIndex = index || loadOrBuildCucumberImpactIndex({ repoRoot: root, force });
  if (!isCucumberImpactIndex(impactIndex)) {
    return cucumberImpactResult({
      gate: "C",
      reasonCodes: ["AMBIGUOUS_STEP_IMPACT"],
      consumerCount: 0,
      confidence: "low",
    });
  }

  // 1. Global Cucumber support changed
  const supportTouched = normalizedFiles.some(
    (file) =>
      isCucumberSupportFile(file, impactIndex) || isCucumberSupportFile(file, effBaseIndex)
  );
  if (supportTouched) {
    return cucumberImpactResult({
      gate: "C",
      reasonCodes: ["GLOBAL_CUCUMBER_SUPPORT_CHANGED"],
      consumerCount: impactIndex?.summary?.totalScenarios ?? impactIndex?.featureFiles?.length ?? 1,
      affectedFeatureFiles: impactIndex?.featureFiles || [],
      confidence: "high",
    });
  }

  // 2. Filter step definition files
  const modifiedStepFiles = normalizedFiles.filter(
    (file) => isStepDefinitionFile(file, impactIndex) || isStepDefinitionFile(file, effBaseIndex)
  );

  if (modifiedStepFiles.length === 0) {
    const affectedFeatureFiles = normalizedFiles.filter((f) => f.endsWith(".feature"));
    return cucumberImpactResult({
      gate: "NONE",
      reasonCodes: [],
      consumerCount: 0,
      affectedFeatureFiles,
      confidence: "high",
    });
  }

  // 3. Collect all feature steps for matching
  const featuresDir = path.join(root, "features");
  const featureFiles = findFeatureFiles(featuresDir, root);
  const allSteps = [];
  for (const file of featureFiles) {
    try {
      const content = fs.readFileSync(path.resolve(root, file), "utf8");
      allSteps.push(...extractStepsFromFeature(content, file));
    } catch {}
  }

  // 4. Compare definitions for each modified step file
  let hasAmbiguousDefs = false;
  const allDeletedDefs = [];
  const allCurrentDefs = [];

  for (const stepFile of modifiedStepFiles) {
    const fullPath = path.resolve(root, stepFile);
    const fileExists = fs.existsSync(fullPath);

    // Extract current definitions
    let curDefs = [];
    if (fileExists) {
      try {
        const content = fs.readFileSync(fullPath, "utf8");
        curDefs = extractStepDefinitionsFromSource(content, stepFile);
        matchDefinitionsAgainstFeatureSteps(curDefs, allSteps);
      } catch {
        curDefs = [];
      }
    }

    // Retrieve base definitions
    const bDefs = effBaseIndex.stepDefinitions.filter(
      (definition) => normalizePath(definition.file) === normalizePath(stepFile)
    );

    if (bDefs.some((definition) => definition.ambiguous)) hasAmbiguousDefs = true;
    if (curDefs.some((definition) => definition.ambiguous)) hasAmbiguousDefs = true;

    const fileDeletedDefs = bDefs.filter(
      (baseDefinition) =>
        !curDefs.some((currentDefinition) =>
          isSameStepDefinition(baseDefinition, currentDefinition)
        )
    );
    allDeletedDefs.push(...fileDeletedDefs);

    allCurrentDefs.push(...curDefs);
  }

  if (hasAmbiguousDefs) {
    const uniqueFeatures = new Set();
    let totalConsumers = 0;
    for (const d of [...allDeletedDefs, ...allCurrentDefs]) {
      for (const c of d.consumers || []) {
        uniqueFeatures.add(c.featureFile);
        totalConsumers++;
      }
    }
    return cucumberImpactResult({
      gate: "C",
      reasonCodes: ["AMBIGUOUS_STEP_IMPACT"],
      consumerCount: totalConsumers,
      affectedFeatureFiles: [...uniqueFeatures],
      confidence: "low",
    });
  }

  // Calculate consumers of deleted definitions
  const deletedConsumerFeatures = new Set();
  let deletedConsumersCount = 0;
  for (const d of allDeletedDefs) {
    for (const c of d.consumers || []) {
      deletedConsumerFeatures.add(c.featureFile);
      deletedConsumersCount++;
    }
  }

  // Calculate consumers of current definitions
  const currentConsumerFeatures = new Set();
  let currentConsumersCount = 0;
  for (const d of allCurrentDefs) {
    for (const c of d.consumers || []) {
      currentConsumerFeatures.add(c.featureFile);
      currentConsumersCount++;
    }
  }

  const combinedFeatures = new Set([...deletedConsumerFeatures, ...currentConsumerFeatures]);

  // A) Step definitions were deleted
  if (allDeletedDefs.length > 0) {
    if (deletedConsumerFeatures.size > 1) {
      return cucumberImpactResult({
        gate: "C",
        reasonCodes: ["DELETED_SHARED_STEP_CONSUMERS"],
        consumerCount: Math.max(deletedConsumersCount, currentConsumersCount),
        affectedFeatureFiles: [...combinedFeatures],
        confidence: "high",
      });
    }

    if (deletedConsumerFeatures.size === 1) {
      const singleFeature = [...deletedConsumerFeatures][0];
      if (combinedFeatures.size === 1) {
        return cucumberImpactResult({
          gate: "B",
          reasonCodes: ["DELETED_STEP_SINGLE_FEATURE_CONSUMER"],
          consumerCount: Math.max(deletedConsumersCount, currentConsumersCount),
          affectedFeatureFiles: [singleFeature],
          confidence: "high",
          parameters: { featureFile: singleFeature },
        });
      } else {
        return cucumberImpactResult({
          gate: "C",
          reasonCodes: ["DELETED_SHARED_STEP_CONSUMERS"],
          consumerCount: Math.max(deletedConsumersCount, currentConsumersCount),
          affectedFeatureFiles: [...combinedFeatures],
          confidence: "high",
        });
      }
    }

    // deletedConsumerFeatures.size === 0 (deleted unused steps)
    if (currentConsumerFeatures.size === 0) {
      return cucumberImpactResult({
        gate: "0",
        reasonCodes: ["NEW_STEP_NO_CONSUMERS"],
        consumerCount: 0,
        confidence: "high",
      });
    }
    if (currentConsumerFeatures.size === 1) {
      const [singleFeature] = [...currentConsumerFeatures];
      return cucumberImpactResult({
        gate: "B",
        reasonCodes: ["SINGLE_FEATURE_STEP_CONSUMER"],
        consumerCount: currentConsumersCount,
        affectedFeatureFiles: [singleFeature],
        confidence: "high",
        parameters: { featureFile: singleFeature },
      });
    }
    return cucumberImpactResult({
      gate: "C",
      reasonCodes: ["SHARED_STEP_CONSUMERS"],
      consumerCount: currentConsumersCount,
      affectedFeatureFiles: [...currentConsumerFeatures],
      confidence: "high",
    });
  }

  // B) No step definitions were deleted
  if (currentConsumerFeatures.size === 0) {
    return cucumberImpactResult({
      gate: "0",
      reasonCodes: ["NEW_STEP_NO_CONSUMERS"],
      consumerCount: 0,
      confidence: "high",
    });
  }

  if (currentConsumerFeatures.size === 1) {
    const [singleFeature] = [...currentConsumerFeatures];
    return cucumberImpactResult({
      gate: "B",
      reasonCodes: ["SINGLE_FEATURE_STEP_CONSUMER"],
      consumerCount: currentConsumersCount,
      affectedFeatureFiles: [singleFeature],
      confidence: "high",
      parameters: { featureFile: singleFeature },
    });
  }

  return cucumberImpactResult({
    gate: "C",
    reasonCodes: ["SHARED_STEP_CONSUMERS"],
    consumerCount: currentConsumersCount,
    affectedFeatureFiles: [...currentConsumerFeatures],
    confidence: "high",
  });
}
