import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { isProductionSourceFile, normalizePath } from "./classify-files.mjs";
import { loadOrBuildCucumberImpactIndex } from "./impact-index.mjs";
import { findRepoRoot } from "./repo-root.mjs";

export const TYPESCRIPT_IMPACT_INDEX_PATH = ".delivery/runtime/indexes/typescript-impact-v1.json";

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  ".delivery",
  ".codex",
  ".agents",
  "reports",
  "dist",
  "coverage",
  "tools",
  "out",
  ".git",
]);

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

export function computeFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(content).digest("hex");
  } catch {
    return null;
  }
}

export function loadTsConfigPaths(repoRoot) {
  const tsconfigPath = path.resolve(repoRoot, "tsconfig.json");
  if (!fs.existsSync(tsconfigPath)) {
    return defaultTsConfigPaths();
  }

  try {
    return parseTsConfigPaths(fs.readFileSync(tsconfigPath, "utf8")).paths;
  } catch {
    // fallback
  }

  return defaultTsConfigPaths();
}

function defaultTsConfigPaths() {
  return {
    baseUrl: ".",
    paths: {
      "@/*": ["./*"],
      "@domain/*": ["./domain/*"],
      "@application/*": ["./application/*"],
      "@infrastructure/*": ["./infrastructure/*"],
      "@ports/*": ["./ports/*"],
    },
  };
}

function parseTsConfigPaths(content) {
  try {
    const parsed = ts.parseConfigFileTextToJson("tsconfig.json", content);
    if (parsed.error || !parsed.config?.compilerOptions) {
      return { paths: defaultTsConfigPaths(), reliable: false };
    }
    return {
      paths: {
        baseUrl: parsed.config.compilerOptions.baseUrl || ".",
        paths: parsed.config.compilerOptions.paths || defaultTsConfigPaths().paths,
      },
      reliable: true,
    };
  } catch {
    return { paths: defaultTsConfigPaths(), reliable: false };
  }
}

export function matchPathAlias(specifier, paths) {
  if (!paths || typeof paths !== "object") return null;

  for (const [pattern, targets] of Object.entries(paths)) {
    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -1);
      if (specifier.startsWith(prefix)) {
        const star = specifier.slice(prefix.length);
        const target = targets[0] || "";
        if (target.endsWith("/*")) {
          return target.slice(0, -1) + star;
        }
        return target;
      }
    } else if (specifier === pattern) {
      return targets[0] || pattern;
    }
  }

  return null;
}

export function findTypeScriptFiles(repoRoot) {
  const results = [];
  if (!fs.existsSync(repoRoot)) return results;

  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) {
          walk(path.join(currentDir, entry.name));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (SOURCE_EXTENSIONS.has(ext) && !entry.name.endsWith(".d.ts")) {
          const rel = normalizePath(path.relative(repoRoot, path.join(currentDir, entry.name)));
          results.push(rel);
        }
      }
    }
  }

  walk(repoRoot);
  return results.sort();
}

export function resolveImportSpecifier(
  specifier,
  sourceFile,
  { repoRoot, tsconfigPaths, fileSet = null }
) {
  if (!specifier || typeof specifier !== "string") {
    return { resolvedPath: null, isExternal: false, isUnresolvable: true };
  }

  let candidateBase = null;
  const isRelative = specifier.startsWith(".");
  const isAbsolute = specifier.startsWith("/");

  if (isRelative) {
    const dir = path.dirname(path.resolve(repoRoot, sourceFile));
    candidateBase = path.resolve(dir, specifier);
  } else if (isAbsolute) {
    candidateBase = path.resolve(repoRoot, specifier.slice(1));
  } else {
    const matched = matchPathAlias(specifier, tsconfigPaths?.paths);
    if (!matched) {
      if (specifier.startsWith("@/") || specifier.startsWith("~/")) {
        return { resolvedPath: null, isExternal: false, isUnresolvable: true };
      }
      if (specifier.startsWith("@")) {
        const scopePackage = specifier.split("/").slice(0, 2).join("/");
        const nodeModulesPath = path.resolve(repoRoot, "node_modules", scopePackage);
        if (!fs.existsSync(nodeModulesPath)) {
          return { resolvedPath: null, isExternal: false, isUnresolvable: true };
        }
      }
      // External package (e.g. "react", "next", "@cucumber/cucumber")
      return { resolvedPath: null, isExternal: true, isUnresolvable: false };
    }
    const baseUrl = tsconfigPaths?.baseUrl || ".";
    candidateBase = path.resolve(repoRoot, baseUrl, matched);
  }

  const CANDIDATE_EXTENSIONS = [
    "",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".d.ts",
    "/index.ts",
    "/index.tsx",
    "/index.js",
    "/index.jsx",
  ];

  for (const ext of CANDIDATE_EXTENSIONS) {
    const full = candidateBase + ext;
    const rel = normalizePath(path.relative(repoRoot, full));
    if (fileSet) {
      if (fileSet.has(rel)) {
        return { resolvedPath: rel, isExternal: false, isUnresolvable: false };
      }
    }
    try {
      if (fs.existsSync(full) && fs.statSync(full).isFile()) {
        return { resolvedPath: rel, isExternal: false, isUnresolvable: false };
      }
    } catch {
      // continue
    }
  }

  return { resolvedPath: null, isExternal: false, isUnresolvable: true };
}

export function extractFileDependencies(
  content,
  sourceFile,
  { repoRoot, tsconfigPaths, fileSet = null }
) {
  const dependencies = new Set();
  let hasDynamicImports = false;
  let hasUnresolvableImports = false;
  let hasAmbiguousBarrel = false;
  const unresolvableSpecifiers = [];
  const dynamicSpecifiers = [];
  let starExportCount = 0;

  let sf;
  try {
    sf = ts.createSourceFile(sourceFile, content, ts.ScriptTarget.Latest, true);
  } catch {
    return {
      dependencies: [],
      hasDynamicImports: true,
      hasUnresolvableImports: true,
      hasAmbiguousBarrel: false,
      unresolvableSpecifiers: ["<parse_error>"],
      dynamicSpecifiers: [],
    };
  }

  function handleSpecifier(specifier, isDynamic = false) {
    if (isDynamic) {
      hasDynamicImports = true;
      dynamicSpecifiers.push(specifier);
    }
    const res = resolveImportSpecifier(specifier, sourceFile, { repoRoot, tsconfigPaths, fileSet });
    if (res.resolvedPath) {
      dependencies.add(res.resolvedPath);
    } else if (res.isUnresolvable) {
      hasUnresolvableImports = true;
      unresolvableSpecifiers.push(specifier);
    }
  }

  function visit(node) {
    if (ts.isImportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        handleSpecifier(node.moduleSpecifier.text, false);
      }
    } else if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        handleSpecifier(node.moduleSpecifier.text, false);
        if (!node.exportClause) {
          starExportCount++;
        }
      }
    } else if (ts.isCallExpression(node)) {
      if (
        node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "import")
      ) {
        hasDynamicImports = true;
        if (
          node.arguments.length > 0 &&
          (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))
        ) {
          handleSpecifier(node.arguments[0].text, true);
        } else {
          // Dynamic import with non-literal expression (e.g. import(varName))
          hasUnresolvableImports = true;
          unresolvableSpecifiers.push("<dynamic_expression>");
        }
      } else if (ts.isIdentifier(node.expression) && node.expression.text === "require") {
        if (
          node.arguments.length > 0 &&
          (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))
        ) {
          handleSpecifier(node.arguments[0].text, false);
        } else {
          hasDynamicImports = true;
          hasUnresolvableImports = true;
          unresolvableSpecifiers.push("<dynamic_require>");
        }
      }
    } else if (ts.isImportTypeNode(node)) {
      if (ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
        handleSpecifier(node.argument.literal.text, false);
      }
    } else if (ts.isImportEqualsDeclaration(node)) {
      if (
        ts.isExternalModuleReference(node.moduleReference) &&
        node.moduleReference.expression &&
        ts.isStringLiteral(node.moduleReference.expression)
      ) {
        handleSpecifier(node.moduleReference.expression.text, false);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);

  if (starExportCount >= 2) {
    hasAmbiguousBarrel = true;
    hasUnresolvableImports = true;
    unresolvableSpecifiers.push("<ambiguous_barrel>");
  }

  return {
    dependencies: [...dependencies].sort(),
    hasDynamicImports,
    hasUnresolvableImports,
    hasAmbiguousBarrel,
    unresolvableSpecifiers,
    dynamicSpecifiers,
  };
}

export function isNextPageOrRoute(filePath) {
  const norm = normalizePath(filePath);
  return /^app\/(?:.*\/)?(?:page|route)\.[cm]?[jt]sx?$/.test(norm);
}

export function isNextLayout(filePath) {
  const norm = normalizePath(filePath);
  return /^app\/(?:.*\/)?layout\.[cm]?[jt]sx?$/.test(norm);
}

export function isGlobalProvider(filePath) {
  const norm = normalizePath(filePath);
  if (norm.startsWith("infrastructure/websocket/")) return true;
  if (/^infrastructure\/api\/ws-/.test(norm)) return true;
  if (/(?:^|\/)(?:providers?|contexts?)\/.*(?:Provider|Context)\.[cm]?[jt]sx?$/.test(norm)) return true;
  if (/^infrastructure\/clock\/ClockContext\.[cm]?[jt]sx?$/.test(norm)) return true;
  return false;
}

export function isServerAction(filePath) {
  const norm = normalizePath(filePath);
  return (
    /^app\/(?:.*\/)?actions.*?\.[cm]?[jt]sx?$/.test(norm) ||
    /^application\/(?:.*\/)?actions.*?\.[cm]?[jt]sx?$/.test(norm)
  );
}

export function isFlowRoot(filePath) {
  return (
    isNextPageOrRoute(filePath) ||
    isNextLayout(filePath) ||
    isGlobalProvider(filePath) ||
    isServerAction(filePath)
  );
}

export function getFlowIdentifier(filePath) {
  const norm = normalizePath(filePath);
  if (norm.startsWith("app/")) {
    const rel = norm.slice(4); // strip "app/"
    const dir = path.dirname(rel);
    return dir === "." ? "root" : dir;
  }
  if (norm.startsWith("application/")) {
    const rel = norm.slice(12);
    const dir = path.dirname(rel);
    return `application/${dir === "." ? "root" : dir}`;
  }
  if (norm.startsWith("infrastructure/")) {
    return `infrastructure/${path.dirname(norm.slice(15))}`;
  }
  return path.dirname(norm);
}

const ROUTE_TO_FEATURE_DOMAIN = [
  { pattern: /^consumidor\/buscar/, domain: "search-discovery" },
  { pattern: /^consumidor\/prestadores/, domain: "search-discovery" },
  { pattern: /^consumidor\/mensajes/, domain: "messaging" },
  { pattern: /^consumidor\/mensajes-ia/, domain: "diagnosis-ia" },
  { pattern: /^consumidor\/diagnostico/, domain: "diagnosis-ia" },
  { pattern: /^consumidor\/mis-servicios/, domain: "work-orders" },
  { pattern: /^prestador\/trabajos/, domain: "work-orders" },
  { pattern: /^prestador\/mensajes/, domain: "messaging" },
  { pattern: /^prestador\/home/, domain: "search-discovery" },
  { pattern: /^prestador\/perfil/, domain: "search-discovery" },
  { pattern: /^onboarding/, domain: "auth-onboarding" },
  { pattern: /^provider\/register\/mercado-pago/, domain: "auth-onboarding" },
  { pattern: /^payments/, domain: "proposals-payments" },
  { pattern: /^consumidor\/pagos/, domain: "proposals-payments" },
];

export function mapFlowToFeatureDomain(flowId) {
  for (const item of ROUTE_TO_FEATURE_DOMAIN) {
    if (item.pattern.test(flowId)) {
      return item.domain;
    }
  }
  return null;
}

export function buildTypeScriptImpactIndex({ repoRoot = findRepoRoot() }) {
  const root = path.resolve(repoRoot);
  const tsconfigPaths = loadTsConfigPaths(root);
  const files = findTypeScriptFiles(root);
  const fileSet = new Set(files);

  const fileHashes = {};
  const fileDetails = {};
  const reverseDependencies = {};
  const flowRoots = [];

  for (const file of files) {
    const fullPath = path.resolve(root, file);
    const hash = computeFileHash(fullPath);
    if (hash) {
      fileHashes[file] = hash;
    }

    let content = "";
    try {
      content = fs.readFileSync(fullPath, "utf8");
    } catch {
      continue;
    }

    const details = extractFileDependencies(content, file, {
      repoRoot: root,
      tsconfigPaths,
      fileSet,
    });

    fileDetails[file] = details;

    if (isFlowRoot(file)) {
      flowRoots.push(file);
    }

    for (const dep of details.dependencies) {
      if (!reverseDependencies[dep]) {
        reverseDependencies[dep] = [];
      }
      reverseDependencies[dep].push(file);
    }
  }

  // Deduplicate and sort reverse dependencies
  for (const dep of Object.keys(reverseDependencies)) {
    reverseDependencies[dep] = [...new Set(reverseDependencies[dep])].sort();
  }

  let totalEdges = 0;
  for (const depList of Object.values(reverseDependencies)) {
    totalEdges += depList.length;
  }

  const index = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    fileHashes,
    files: fileDetails,
    reverseDependencies,
    flowRoots: flowRoots.sort(),
    summary: {
      totalFiles: files.length,
      totalEdges,
      totalFlowRoots: flowRoots.length,
    },
  };

  const targetPath = path.resolve(root, TYPESCRIPT_IMPACT_INDEX_PATH);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(index, null, 2), "utf8");

  return index;
}

export function isTypeScriptCacheValid({ repoRoot, cachedIndex }) {
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

  const currentFiles = findTypeScriptFiles(root);
  if (currentFiles.length !== Object.keys(cachedIndex.fileHashes).length) {
    return false;
  }
  for (const f of currentFiles) {
    if (!cachedIndex.fileHashes[f]) return false;
  }

  return true;
}

export function loadOrBuildTypeScriptImpactIndex({ repoRoot = findRepoRoot(), force = false } = {}) {
  const root = path.resolve(repoRoot);
  const cachePath = path.resolve(root, TYPESCRIPT_IMPACT_INDEX_PATH);

  if (!force && fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
      if (isTypeScriptCacheValid({ repoRoot: root, cachedIndex: cached })) {
        return cached;
      }
    } catch {
      // Cache corrupt or unreadable, rebuild below
    }
  }

  return buildTypeScriptImpactIndex({ repoRoot: root });
}

export function getBaseTypeScriptIndex({ repoRoot, index = null, baseIndex = null }) {
  if (baseIndex) return baseIndex;
  if (index) return index;

  const root = path.resolve(repoRoot);
  const cachePath = path.resolve(root, TYPESCRIPT_IMPACT_INDEX_PATH);
  if (fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
      if (cached && cached.schemaVersion === 1 && cached.files && cached.reverseDependencies) {
        return cached;
      }
      return { corrupt: true };
    } catch {
      return { corrupt: true };
    }
  }
  return null;
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

// Build the dependency graph as it existed in HEAD. This is intentionally
// in-memory: a deleted file is no longer visible to the working-tree index,
// but its former consumers are still needed to classify the deletion safely.
export function buildGitHeadTypeScriptImpactIndex({ repoRoot = findRepoRoot() } = {}) {
  const root = path.resolve(repoRoot);
  let names;
  try {
    names = execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    })
      .split(/\r?\n/)
      .map(normalizePath)
      .filter(Boolean);
  } catch {
    return null;
  }

  const files = names.filter((file) => {
    const ext = path.extname(file);
    return SOURCE_EXTENSIONS.has(ext) && !file.endsWith(".d.ts") &&
      !file.split("/").some((part) => EXCLUDED_DIRS.has(part));
  });
  const fileSet = new Set(files);
  // Resolve aliases from the committed tree. Reading the working-tree
  // tsconfig here can make a deleted import appear resolvable (or vice versa)
  // when the current branch has already changed its aliases.
  let tsconfigPaths = defaultTsConfigPaths();
  let reconstructionReliable = true;
  try {
    const headTsconfig = execFileSync("git", ["show", "HEAD:tsconfig.json"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const parsed = parseTsConfigPaths(headTsconfig);
    tsconfigPaths = parsed.paths;
    reconstructionReliable = parsed.reliable;
  } catch {
    // A repository without a committed tsconfig cannot safely reconstruct
    // alias imports from HEAD. Relative imports may still be collected, but
    // callers must treat the resulting graph as low-confidence.
    reconstructionReliable = false;
  }
  const fileDetails = {};
  const fileHashes = {};
  const reverseDependencies = {};
  let complete = true;

  for (const file of files) {
    let content;
    try {
      content = execFileSync("git", ["show", `HEAD:${file}`], {
        cwd: root,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });
    } catch {
      complete = false;
      continue;
    }
    fileHashes[file] = crypto.createHash("sha256").update(content).digest("hex");
    const details = extractFileDependencies(content, file, {
      repoRoot: root,
      tsconfigPaths,
      fileSet,
    });
    fileDetails[file] = details;
    for (const dep of details.dependencies) {
      (reverseDependencies[dep] ||= []).push(file);
    }
  }
  for (const dep of Object.keys(reverseDependencies)) {
    reverseDependencies[dep] = [...new Set(reverseDependencies[dep])].sort();
  }
  return {
    schemaVersion: 1,
    fileHashes,
    files: fileDetails,
    reverseDependencies,
    flowRoots: files.filter(isFlowRoot),
    summary: {
      totalFiles: files.length,
      totalEdges: Object.values(reverseDependencies).reduce((sum, xs) => sum + xs.length, 0),
      totalFlowRoots: files.filter(isFlowRoot).length,
    },
    reconstructionReliable: reconstructionReliable && complete && Object.keys(fileDetails).length === files.length,
  };
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.length > 0);
}

/**
 * Validate the graph itself, not just its top-level JSON shape. A partial
 * index must never be allowed to turn an impacted production file into Gate A.
 * Hashes are checked for integrity/shape here; snapshot hashes are not
 * compared to the working tree because a supplied base index is expected to
 * describe the pre-change tree.
 */
export function isTypeScriptImpactIndexReliable(index, { relevantFiles = [] } = {}) {
  if (!index || index.schemaVersion !== 1 ||
      !index.fileHashes || typeof index.fileHashes !== "object" || Array.isArray(index.fileHashes) ||
      !index.files || typeof index.files !== "object" || Array.isArray(index.files) ||
      !index.reverseDependencies || typeof index.reverseDependencies !== "object" || Array.isArray(index.reverseDependencies) ||
      !Array.isArray(index.flowRoots) || !index.summary || typeof index.summary !== "object") {
    return false;
  }

  const fileNames = Object.keys(index.files);
  const hashNames = Object.keys(index.fileHashes);
  if (fileNames.length === 0 || hashNames.length !== fileNames.length) return false;
  for (const file of fileNames) {
    if (!isSha256(index.fileHashes[file])) return false;
    const details = index.files[file];
    if (!details || !isStringArray(details.dependencies) ||
        typeof details.hasDynamicImports !== "boolean" ||
        typeof details.hasUnresolvableImports !== "boolean" ||
        typeof details.hasAmbiguousBarrel !== "boolean" ||
        !isStringArray(details.unresolvableSpecifiers) ||
        !Array.isArray(details.dynamicSpecifiers) ||
        !details.dynamicSpecifiers.every((specifier) => typeof specifier === "string")) {
      return false;
    }
  }

  const fileSet = new Set(fileNames);
  for (const [dependency, consumers] of Object.entries(index.reverseDependencies)) {
    if (!isStringArray(consumers)) return false;
    for (const consumer of consumers) {
      if (!fileSet.has(consumer) || !index.files[consumer].dependencies.includes(dependency)) return false;
    }
  }
  for (const [file, details] of Object.entries(index.files)) {
    for (const dependency of details.dependencies) {
      // Resolved non-source assets (CSS, images, etc.) are intentionally not
      // present in the TS index, but their reverse edge is still useful. A
      // source dependency must be represented by a complete indexed node.
      if (fileSet.has(dependency) && !index.reverseDependencies[dependency]?.includes(file)) return false;
    }
  }
  if (!index.flowRoots.every((file) => fileSet.has(file))) return false;
  if (index.summary.totalFiles !== fileNames.length ||
      index.summary.totalEdges !== Object.values(index.reverseDependencies).reduce((sum, xs) => sum + xs.length, 0) ||
      index.summary.totalFlowRoots !== index.flowRoots.length) return false;

  for (const file of relevantFiles.map(normalizePath)) {
    if (!index.files[file] || !isSha256(index.fileHashes[file])) return false;
  }
  return true;
}

function isCucumberImpactIndexReliable(index) {
  if (!index || index.schemaVersion !== 1 ||
      !index.fileHashes || typeof index.fileHashes !== "object" || Array.isArray(index.fileHashes) ||
      !isStringArray(index.featureFiles) || !isStringArray(index.stepFiles) ||
      !isStringArray(index.supportFiles) || !isStringArray(index.reachableSupportFiles) ||
      !Array.isArray(index.stepDefinitions) || !index.summary || typeof index.summary !== "object") {
    return false;
  }
  const allIndexedFiles = new Set([
    ...index.featureFiles,
    ...index.stepFiles,
    ...index.supportFiles,
    ...index.reachableSupportFiles,
  ]);
  const hashNames = Object.keys(index.fileHashes);
  if (hashNames.length !== allIndexedFiles.size || hashNames.some((file) => !allIndexedFiles.has(file))) return false;
  // Every source contributing to matching must have a trustworthy hash. This
  // catches indexes that only contain the arrays but were truncated while
  // being written.
  for (const file of allIndexedFiles) {
    if (!isSha256(index.fileHashes[file])) return false;
  }
  const arraysAreUnique = [
    index.featureFiles,
    index.stepFiles,
    index.supportFiles,
    index.reachableSupportFiles,
  ].every((items) => new Set(items).size === items.length);
  if (!arraysAreUnique) return false;
  for (const key of ["totalFeatures", "totalScenarios", "totalSteps", "totalStepDefinitions", "totalSupportFiles", "totalReachableSupportFiles"]) {
    if (!Number.isInteger(index.summary[key]) || index.summary[key] < 0) return false;
  }
  if (index.summary.totalFeatures !== index.featureFiles.length ||
      index.summary.totalStepDefinitions !== index.stepDefinitions.length ||
      index.summary.totalSupportFiles !== index.supportFiles.length ||
      index.summary.totalReachableSupportFiles !== index.reachableSupportFiles.length) {
    return false;
  }
  const featureSet = new Set(index.featureFiles);
  const stepSet = new Set(index.stepFiles);
  for (const def of index.stepDefinitions) {
    if (!def || typeof def.id !== "string" || typeof def.keyword !== "string" ||
        !Number.isInteger(def.line) || typeof def.file !== "string" || !stepSet.has(normalizePath(def.file)) ||
        typeof def.pattern !== "string" || typeof def.patternType !== "string" ||
        typeof def.ambiguous !== "boolean" || !Array.isArray(def.consumers) ||
        !isStringArray(def.consumerFeatures)) return false;
    if (def.consumerFeatures.some((feature) => !featureSet.has(normalizePath(feature)))) return false;
    for (const consumer of def.consumers) {
      if (!consumer || typeof consumer.featureFile !== "string" ||
          !featureSet.has(normalizePath(consumer.featureFile)) ||
          typeof consumer.scenario !== "string" || !Number.isInteger(consumer.line) ||
          typeof consumer.stepText !== "string") return false;
    }
  }
  return true;
}

export function analyzeTypeScriptImpact({
  repoRoot = findRepoRoot(),
  files = [],
  index = null,
  baseIndex = null,
  force = false,
  cucumberIndex = null,
} = {}) {
  const root = path.resolve(repoRoot);
  const normalizedFiles = files.map(normalizePath);

  const effBaseIndex = getBaseTypeScriptIndex({ repoRoot: root, index, baseIndex });
  const hasExplicitIndex = Boolean(index || baseIndex);
  let impactIndex = effBaseIndex && !effBaseIndex.corrupt &&
    isTypeScriptImpactIndexReliable(effBaseIndex)
    ? effBaseIndex
    : null;
  // An explicitly supplied partial snapshot is evidence failure. A stale or
  // old on-disk cache, on the other hand, can be safely regenerated.
  if (hasExplicitIndex && effBaseIndex && !impactIndex && !effBaseIndex.corrupt) {
    impactIndex = { corrupt: true };
  }
  if (!impactIndex) {
    try {
      impactIndex = loadOrBuildTypeScriptImpactIndex({ repoRoot: root, force });
      if (!isTypeScriptImpactIndexReliable(impactIndex)) {
        impactIndex = buildTypeScriptImpactIndex({ repoRoot: root });
      }
    } catch {
      impactIndex = null;
    }
  }

  const tsFiles = normalizedFiles.filter((f) => isProductionSourceFile(f));

  if (tsFiles.length === 0) {
    return {
      gate: "NONE",
      reasonCodes: [],
      consumerCount: 0,
      affectedFeatures: 0,
      confidence: "high",
    };
  }

  if (effBaseIndex?.corrupt) {
    return {
      gate: "C",
      reasonCodes: ["AMBIGUOUS_DEPENDENCY_IMPACT"],
      consumerCount: 0,
      affectedFeatures: 0,
      confidence: "low",
    };
  }

  // Prefer the supplied/base index, but recover a missing deleted target from
  // HEAD when possible. If neither source can describe it, remain fail-closed.
  const deletedCandidates = tsFiles.filter((file) => !fs.existsSync(path.resolve(root, file)));
  if (deletedCandidates.length > 0) {
    const headIndex = buildGitHeadTypeScriptImpactIndex({ repoRoot: root });
    if (headIndex) {
      const baseDescribesDeleted = deletedCandidates.every((file) => Boolean(impactIndex?.files?.[file]));
      if (!impactIndex) impactIndex = headIndex;
      else {
        const mergedReverseDependencies = { ...(headIndex.reverseDependencies || {}) };
        for (const [dependency, consumers] of Object.entries(impactIndex.reverseDependencies || {})) {
          mergedReverseDependencies[dependency] = [
            ...new Set([...(mergedReverseDependencies[dependency] || []), ...consumers]),
          ].sort();
        }
        const mergedFiles = { ...headIndex.files, ...(impactIndex.files || {}) };
        const mergedHashes = { ...headIndex.fileHashes, ...(impactIndex.fileHashes || {}) };
        const mergedFlowRoots = [...new Set([
          ...(headIndex.flowRoots || []),
          ...(impactIndex.flowRoots || []),
        ])].sort();
        impactIndex = {
          ...impactIndex,
          fileHashes: mergedHashes,
          files: mergedFiles,
          reverseDependencies: mergedReverseDependencies,
          flowRoots: mergedFlowRoots,
          summary: {
            totalFiles: Object.keys(mergedFiles).length,
            totalEdges: Object.values(mergedReverseDependencies).reduce((sum, xs) => sum + xs.length, 0),
            totalFlowRoots: mergedFlowRoots.length,
          },
        };
      }
      if (!headIndex.reconstructionReliable && !baseDescribesDeleted) {
        impactIndex = { ...impactIndex, corrupt: true };
      }
    }
  }

  const knownFiles = impactIndex?.files || {};
  const reverseDeps = impactIndex?.reverseDependencies || {};

  // Do this after the HEAD merge so a deleted file can be validated against
  // its committed snapshot. An empty/partial index is never sufficient
  // evidence for an impacted production file.
  if (!impactIndex || impactIndex.corrupt || !isTypeScriptImpactIndexReliable(impactIndex, { relevantFiles: tsFiles })) {
    return {
      gate: "C",
      reasonCodes: ["AMBIGUOUS_DEPENDENCY_IMPACT"],
      consumerCount: 0,
      affectedFeatures: 0,
      confidence: "low",
    };
  }

  const allConsumers = new Set();
  let isAmbiguous = false;
  let isGlobal = false;
  let hasDeletedFiles = false;
  const flowRootsFound = new Set();
  const flowsFound = new Set();
  const affectedFeatureDomains = new Set();
  const stepConsumers = new Set();
  const currentDetailsByFile = new Map();
  const currentFileSet = new Set(findTypeScriptFiles(root));
  const currentTsconfigPaths = loadTsConfigPaths(root);
  const modifiedFeatureTsFiles = normalizedFiles.filter((file) =>
    /^features\/.+\.[cm]?[jt]sx?$/.test(file)
  );

  // A base index is useful for reverse edges, but changed files must always
  // be parsed from the working tree. Otherwise a newly introduced dynamic
  // import/require can be hidden by the stale cached details.
  for (const stagedFile of tsFiles) {
    if (!fs.existsSync(path.resolve(root, stagedFile))) continue;
    try {
      const content = fs.readFileSync(path.resolve(root, stagedFile), "utf8");
      currentDetailsByFile.set(
        stagedFile,
        extractFileDependencies(content, stagedFile, {
          repoRoot: root,
          tsconfigPaths: currentTsconfigPaths,
          fileSet: currentFileSet,
        })
      );
    } catch {
      isAmbiguous = true;
    }
  }

  // Feature step consumers are intentionally excluded from the production
  // source set above. If one is modified, however, its current imports must
  // be reanalysed: a newly introduced dynamic import can invalidate the
  // otherwise stale reverse graph.
  for (const featureFile of modifiedFeatureTsFiles) {
    const fullPath = path.resolve(root, featureFile);
    if (!fs.existsSync(fullPath)) {
      isAmbiguous = true;
      continue;
    }
    try {
      const content = fs.readFileSync(fullPath, "utf8");
      const details = extractFileDependencies(content, featureFile, {
        repoRoot: root,
        tsconfigPaths: currentTsconfigPaths,
        fileSet: currentFileSet,
      });
      currentDetailsByFile.set(featureFile, details);
      if (details.hasDynamicImports || details.hasUnresolvableImports || details.hasAmbiguousBarrel) {
        isAmbiguous = true;
      }
      for (const stagedFile of tsFiles) {
        if (details.dependencies.includes(stagedFile)) {
          allConsumers.add(featureFile);
          stepConsumers.add(featureFile);
          const parts = featureFile.split("/");
          if (parts.length > 1) affectedFeatureDomains.add(parts[1]);
        }
      }
    } catch {
      isAmbiguous = true;
    }
  }

  for (const stagedFile of tsFiles) {
    const full = path.resolve(root, stagedFile);
    const fileExists = fs.existsSync(full);

    if (!fileExists) {
      const wasInBase = Boolean(knownFiles[stagedFile] || effBaseIndex?.fileHashes?.[stagedFile]);
      const wasInGit = isFileInGitHead(root, stagedFile);
      if (wasInBase) {
        hasDeletedFiles = true;
      } else if (wasInGit) {
        hasDeletedFiles = true;
        isAmbiguous = true;
      }
    }

    if (isNextLayout(stagedFile) || isGlobalProvider(stagedFile)) {
      isGlobal = true;
    }
    if (isFlowRoot(stagedFile)) {
      flowRootsFound.add(stagedFile);
      const flowId = getFlowIdentifier(stagedFile);
      flowsFound.add(flowId);
      const domain = mapFlowToFeatureDomain(flowId);
      if (domain) affectedFeatureDomains.add(domain);
    }

    const details = currentDetailsByFile.get(stagedFile) || knownFiles[stagedFile];
    if (details) {
      if (details.hasDynamicImports || details.hasUnresolvableImports || details.hasAmbiguousBarrel) {
        isAmbiguous = true;
      }
    } else if (fileExists) {
      try {
        const content = fs.readFileSync(full, "utf8");
        const tsconfigPaths = loadTsConfigPaths(root);
        const liveDetails = extractFileDependencies(content, stagedFile, {
          repoRoot: root,
          tsconfigPaths,
        });
        if (liveDetails.hasDynamicImports || liveDetails.hasUnresolvableImports || liveDetails.hasAmbiguousBarrel) {
          isAmbiguous = true;
        }
      } catch {
        isAmbiguous = true;
      }
    }

    // Transitive BFS on reverseDependencies
    const visited = new Set();
    const queue = [stagedFile];

    while (queue.length > 0) {
      const current = queue.shift();
      const consumers = reverseDeps[current] || [];
      for (const consumer of consumers) {
        if (!visited.has(consumer)) {
          visited.add(consumer);
          allConsumers.add(consumer);
          queue.push(consumer);

          if (isNextLayout(consumer) || isGlobalProvider(consumer)) {
            isGlobal = true;
          }

          if (isFlowRoot(consumer)) {
            flowRootsFound.add(consumer);
            const flowId = getFlowIdentifier(consumer);
            flowsFound.add(flowId);
            const domain = mapFlowToFeatureDomain(flowId);
            if (domain) affectedFeatureDomains.add(domain);
          }

          if (consumer.startsWith("features/") && /\.[cm]?[jt]sx?$/.test(consumer)) {
            stepConsumers.add(consumer);
            const parts = consumer.split("/");
            if (parts.length > 1) {
              affectedFeatureDomains.add(parts[1]);
            }
          }

          let consumerDetails = currentDetailsByFile.get(consumer) || knownFiles[consumer];
          if (consumer.startsWith("features/") && /\.[cm]?[jt]sx?$/.test(consumer) && fs.existsSync(path.resolve(root, consumer))) {
            try {
              consumerDetails = extractFileDependencies(
                fs.readFileSync(path.resolve(root, consumer), "utf8"),
                consumer,
                { repoRoot: root, tsconfigPaths: currentTsconfigPaths, fileSet: currentFileSet }
              );
              currentDetailsByFile.set(consumer, consumerDetails);
            } catch {
              isAmbiguous = true;
            }
          }
          if (consumerDetails?.hasDynamicImports || consumerDetails?.hasUnresolvableImports || consumerDetails?.hasAmbiguousBarrel) {
            isAmbiguous = true;
          }
        }
      }
    }
  }

  // Factorear stepConsumers
  const stepFeatures = new Set();
  let stepConsumerImpactUnknown = false;
  if (stepConsumers.size > 0) {
    let cIndex = cucumberIndex;
    if (!cIndex) {
      try {
        cIndex = loadOrBuildCucumberImpactIndex({ repoRoot: root });
      } catch {}
    }
    const reliableCucumberIndex = isCucumberImpactIndexReliable(cIndex);
    if (!reliableCucumberIndex) {
      stepConsumerImpactUnknown = true;
    } else {
      for (const def of cIndex.stepDefinitions) {
        if (stepConsumers.has(normalizePath(def.file))) {
          for (const f of def.consumerFeatures || []) {
            stepFeatures.add(f);
          }
        }
      }
      for (const sc of stepConsumers) {
        const mapped = cIndex.stepDefinitions.some(
          (def) => normalizePath(def.file) === normalizePath(sc)
        );
        if (!mapped) stepConsumerImpactUnknown = true;
      }
    }
  }

  const isSharedStepDependency = stepFeatures.size >= 2 || (stepConsumers.size >= 2 && affectedFeatureDomains.size >= 2);
  const distinctFlowCount = flowsFound.size;
  const distinctFeatureCount = Math.max(
    affectedFeatureDomains.size,
    distinctFlowCount,
    stepFeatures.size
  );

  // Multiple step-definition consumers are already a conservative shared
  // dependency signal even when the Cucumber index has no matching entries
  // (for example while a new feature index is being generated). Keep the
  // historical reason code for this unambiguous fan-out; a single unmapped
  // consumer remains low-confidence below.
  if (stepConsumerImpactUnknown && stepConsumers.size >= 2 && !isAmbiguous) {
    return {
      gate: "C",
      reasonCodes: ["SHARED_STEP_DEPENDENCY_CONSUMERS"],
      consumerCount: allConsumers.size,
      affectedFeatures: distinctFeatureCount,
      confidence: "high",
    };
  }

  if (isAmbiguous || stepConsumerImpactUnknown) {
    return {
      gate: "C",
      reasonCodes: [
        ...(isAmbiguous ? ["AMBIGUOUS_DEPENDENCY_IMPACT"] : []),
        ...(stepConsumerImpactUnknown ? ["AMBIGUOUS_STEP_IMPACT"] : []),
      ],
      consumerCount: allConsumers.size,
      affectedFeatures: distinctFeatureCount,
      confidence: "low",
    };
  }

  if (isGlobal) {
    return {
      gate: "C",
      reasonCodes: ["GLOBAL_LAYOUT_OR_PROVIDER"],
      consumerCount: allConsumers.size,
      affectedFeatures: distinctFeatureCount,
      confidence: "high",
    };
  }

  if (isSharedStepDependency) {
    const reasonCodes = ["SHARED_STEP_DEPENDENCY_CONSUMERS"];
    if (hasDeletedFiles) {
      reasonCodes.push("DELETED_SHARED_DEPENDENCY");
    }
    if (distinctFlowCount >= 2) {
      reasonCodes.push("MULTIPLE_FLOW_CONSUMERS");
    }
    return {
      gate: "C",
      reasonCodes,
      consumerCount: allConsumers.size,
      affectedFeatures: distinctFeatureCount,
      confidence: "high",
    };
  }

  if (hasDeletedFiles && distinctFlowCount >= 2) {
    return {
      gate: "C",
      reasonCodes: ["DELETED_SHARED_DEPENDENCY"],
      consumerCount: allConsumers.size,
      affectedFeatures: distinctFeatureCount,
      confidence: "high",
    };
  }

  if (distinctFlowCount >= 2) {
    return {
      gate: "C",
      reasonCodes: ["MULTIPLE_FLOW_CONSUMERS"],
      consumerCount: allConsumers.size,
      affectedFeatures: distinctFeatureCount,
      confidence: "high",
    };
  }

  if (distinctFlowCount === 1) {
    return {
      gate: "A",
      reasonCodes: ["SINGLE_FLOW_CONSUMER"],
      consumerCount: allConsumers.size,
      affectedFeatures: distinctFeatureCount,
      confidence: "high",
    };
  }

  return {
    gate: "A",
    reasonCodes: ["ISOLATED_PRODUCTION_CODE"],
    consumerCount: allConsumers.size,
    affectedFeatures: 0,
    confidence: "high",
  };
}
