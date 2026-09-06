import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  CucumberExpression,
  RegularExpression,
  ParameterTypeRegistry,
} from "@cucumber/cucumber-expressions";
import { normalizePath } from "./classify-files.mjs";
import { findRepoRoot } from "./repo-root.mjs";

export const CUCUMBER_IMPACT_INDEX_PATH = ".delivery/runtime/indexes/cucumber-impact-v1.json";

const STEP_KEYWORD_REGEX = /^\s*(Given|When|Then|And|But|Dado|Cuando|Entonces|Y|Pero)\s+(.+)$/;
const SCENARIO_REGEX = /^\s*(?:Scenario|Scenario Outline|Escenario|Esquema del escenario):\s*(.+)$/i;
const FEATURE_REGEX = /^\s*Feature:\s*(.+)$/i;
const BACKGROUND_REGEX = /^\s*Background:/i;

export function computeFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(content).digest("hex");
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
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
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
      } else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry.name)) {
        const rel = normalizePath(path.relative(repoRoot, full));
        supportFiles.push(rel);
        reachableFiles.add(rel);
        queue.push(full);
      }
    }
  }

  collectSupport(supportDir);

  const importRegex = /(?:import|export)\s+(?:[\s\S]*?from\s+)?["'](\.[^"']+)["']|require\s*\(\s*["'](\.[^"']+)["']\s*\)/g;
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
    while ((match = importRegex.exec(content)) !== null) {
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

export function buildCucumberImpactIndex({ repoRoot = findRepoRoot() } = {}) {
  const root = path.resolve(repoRoot);
  const featuresDir = path.join(root, "features");

  const featureFiles = findFeatureFiles(featuresDir, root);
  const stepFiles = findStepFiles(featuresDir, root);
  const { supportFiles, reachableFiles } = findReachableSupportFiles(root);

  const fileHashes = {};

  for (const file of featureFiles) {
    const hash = computeFileHash(path.resolve(root, file));
    if (hash) fileHashes[file] = hash;
  }
  for (const file of stepFiles) {
    const hash = computeFileHash(path.resolve(root, file));
    if (hash) fileHashes[file] = hash;
  }
  for (const file of reachableFiles) {
    const hash = computeFileHash(path.resolve(root, file));
    if (hash) fileHashes[file] = hash;
  }

  // 1. Extract all steps from all feature files
  const allSteps = [];
  const scenarioNames = new Set();
  for (const file of featureFiles) {
    try {
      const content = fs.readFileSync(path.resolve(root, file), "utf8");
      const steps = extractStepsFromFeature(content, file);
      for (const s of steps) {
        allSteps.push(s);
        scenarioNames.add(`${s.featureFile}#${s.scenario}`);
      }
    } catch {
      // ignore unreadable files
    }
  }

  // 2. Extract step definitions from all step files
  const stepDefinitions = [];
  for (const file of stepFiles) {
    try {
      const content = fs.readFileSync(path.resolve(root, file), "utf8");
      const defs = extractStepDefinitionsFromSource(content, file);
      stepDefinitions.push(...defs);
    } catch {
      // ignore unreadable files
    }
  }

  // 3. Compile and match step definitions with feature steps
  matchDefinitionsAgainstFeatureSteps(stepDefinitions, allSteps);

  const index = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    fileHashes,
    featureFiles,
    stepFiles,
    supportFiles,
    reachableSupportFiles: reachableFiles,
    stepDefinitions,
    summary: {
      totalFeatures: featureFiles.length,
      totalScenarios: scenarioNames.size,
      totalSteps: allSteps.length,
      totalStepDefinitions: stepDefinitions.length,
      totalSupportFiles: supportFiles.length,
      totalReachableSupportFiles: reachableFiles.length,
    },
  };

  const targetPath = path.resolve(root, CUCUMBER_IMPACT_INDEX_PATH);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(index, null, 2), "utf8");

  return index;
}

export function isCacheValid({ repoRoot, cachedIndex }) {
  if (!cachedIndex || cachedIndex.schemaVersion !== 1 || !cachedIndex.fileHashes) {
    return false;
  }

  const root = path.resolve(repoRoot);

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
  if (norm.startsWith("features/support/")) return false;
  if (index?.stepFiles?.includes(norm)) return true;
  if (norm.startsWith("features/") && norm.endsWith(".ts")) return true;
  if (norm.includes("step_definitions/")) return true;
  if (norm.includes("_steps.ts") || norm.includes(".steps.ts")) return true;
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
  try {
    const stdout = execFileSync("git", ["show", `HEAD:${relativePath}`], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    return stdout;
  } catch {
    return null;
  }
}

export function getBaseCucumberIndex({ repoRoot, index = null, baseIndex = null }) {
  if (baseIndex) return baseIndex;
  if (index) return index;

  const root = path.resolve(repoRoot);
  const targetPath = path.resolve(root, CUCUMBER_IMPACT_INDEX_PATH);
  if (fs.existsSync(targetPath)) {
    try {
      const raw = fs.readFileSync(targetPath, "utf8");
      const cached = JSON.parse(raw);
      if (cached && cached.schemaVersion === 1 && Array.isArray(cached.stepDefinitions)) {
        return cached;
      }
      return { corrupt: true };
    } catch {
      return { corrupt: true };
    }
  }
  return null;
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

  const effBaseIndex = getBaseCucumberIndex({ repoRoot: root, index, baseIndex });
  if (effBaseIndex?.corrupt) {
    return {
      gate: "C",
      reasonCodes: ["AMBIGUOUS_STEP_IMPACT"],
      consumerCount: 0,
      affectedFeatures: 0,
      confidence: "low",
    };
  }
  const impactIndex = effBaseIndex || loadOrBuildCucumberImpactIndex({ repoRoot: root, force });

  // 1. Global Cucumber support changed
  const supportTouched = normalizedFiles.some((f) => isCucumberSupportFile(f, impactIndex));
  if (supportTouched) {
    return {
      gate: "C",
      reasonCodes: ["GLOBAL_CUCUMBER_SUPPORT_CHANGED"],
      consumerCount: impactIndex?.summary?.totalScenarios ?? impactIndex?.featureFiles?.length ?? 1,
      affectedFeatures: impactIndex?.featureFiles?.length ?? 1,
      confidence: "high",
    };
  }

  // 2. Filter step definition files
  const modifiedStepFiles = normalizedFiles.filter((f) => isStepDefinitionFile(f, impactIndex));

  if (modifiedStepFiles.length === 0) {
    const affectedFeatureFiles = normalizedFiles.filter((f) => f.endsWith(".feature"));
    return {
      gate: "NONE",
      reasonCodes: [],
      consumerCount: 0,
      affectedFeatures: affectedFeatureFiles.length,
      confidence: "high",
    };
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
  let unreconstructibleBase = false;
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
    let bDefs = null;
    if (effBaseIndex?.stepDefinitions) {
      bDefs = effBaseIndex.stepDefinitions.filter((d) => normalizePath(d.file) === normalizePath(stepFile));
    }
    if (!bDefs || bDefs.length === 0) {
      const gitContent = readBaseFileFromGit(root, stepFile);
      if (gitContent !== null) {
        bDefs = extractStepDefinitionsFromSource(gitContent, stepFile);
        matchDefinitionsAgainstFeatureSteps(bDefs, allSteps);
      }
    }

    if (bDefs === null) {
      if (!fileExists) {
        unreconstructibleBase = true;
      } else {
        bDefs = curDefs;
      }
    }

    if (bDefs) {
      if (bDefs.some((d) => d.ambiguous)) hasAmbiguousDefs = true;
      if (curDefs.some((d) => d.ambiguous)) hasAmbiguousDefs = true;

      const fileDeletedDefs = bDefs.filter((b) => !curDefs.some((c) => isSameStepDefinition(b, c)));
      allDeletedDefs.push(...fileDeletedDefs);
    }

    allCurrentDefs.push(...curDefs);
  }

  if (unreconstructibleBase) {
    return {
      gate: "C",
      reasonCodes: ["AMBIGUOUS_STEP_IMPACT"],
      consumerCount: 0,
      affectedFeatures: 0,
      confidence: "low",
    };
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
    return {
      gate: "C",
      reasonCodes: ["AMBIGUOUS_STEP_IMPACT"],
      consumerCount: totalConsumers,
      affectedFeatures: uniqueFeatures.size,
      confidence: "low",
    };
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
      return {
        gate: "C",
        reasonCodes: ["DELETED_SHARED_STEP_CONSUMERS"],
        consumerCount: Math.max(deletedConsumersCount, currentConsumersCount),
        affectedFeatures: deletedConsumerFeatures.size,
        confidence: "high",
      };
    }

    if (deletedConsumerFeatures.size === 1) {
      const singleFeature = [...deletedConsumerFeatures][0];
      if (combinedFeatures.size === 1) {
        return {
          gate: "B",
          reasonCodes: ["DELETED_STEP_SINGLE_FEATURE_CONSUMER"],
          consumerCount: Math.max(deletedConsumersCount, currentConsumersCount),
          affectedFeatures: 1,
          confidence: "high",
          parameters: { featureFile: singleFeature },
        };
      } else {
        return {
          gate: "C",
          reasonCodes: ["DELETED_SHARED_STEP_CONSUMERS"],
          consumerCount: Math.max(deletedConsumersCount, currentConsumersCount),
          affectedFeatures: combinedFeatures.size,
          confidence: "high",
        };
      }
    }

    // deletedConsumerFeatures.size === 0 (deleted unused steps)
    if (currentConsumerFeatures.size === 0) {
      return {
        gate: "0",
        reasonCodes: ["NEW_STEP_NO_CONSUMERS"],
        consumerCount: 0,
        affectedFeatures: 0,
        confidence: "high",
      };
    }
    if (currentConsumerFeatures.size === 1) {
      return {
        gate: "B",
        reasonCodes: ["SINGLE_FEATURE_STEP_CONSUMER"],
        consumerCount: currentConsumersCount,
        affectedFeatures: 1,
        confidence: "high",
        parameters: { featureFile: [...currentConsumerFeatures][0] },
      };
    }
    return {
      gate: "C",
      reasonCodes: ["SHARED_STEP_CONSUMERS"],
      consumerCount: currentConsumersCount,
      affectedFeatures: currentConsumerFeatures.size,
      confidence: "high",
    };
  }

  // B) No step definitions were deleted
  if (currentConsumerFeatures.size === 0) {
    return {
      gate: "0",
      reasonCodes: ["NEW_STEP_NO_CONSUMERS"],
      consumerCount: 0,
      affectedFeatures: 0,
      confidence: "high",
    };
  }

  if (currentConsumerFeatures.size === 1) {
    const [singleFeature] = [...currentConsumerFeatures];
    return {
      gate: "B",
      reasonCodes: ["SINGLE_FEATURE_STEP_CONSUMER"],
      consumerCount: currentConsumersCount,
      affectedFeatures: 1,
      confidence: "high",
      parameters: { featureFile: singleFeature },
    };
  }

  return {
    gate: "C",
    reasonCodes: ["SHARED_STEP_CONSUMERS"],
    consumerCount: currentConsumersCount,
    affectedFeatures: currentConsumerFeatures.size,
    confidence: "high",
  };
}
