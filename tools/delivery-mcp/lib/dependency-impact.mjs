import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { isProductionSourceFile, normalizePath } from "./classify-files.mjs";
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

  try {
    const { config, error } = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    if (!error && config?.compilerOptions) {
      return {
        baseUrl: config.compilerOptions.baseUrl || ".",
        paths: config.compilerOptions.paths || {
          "@/*": ["./*"],
          "@domain/*": ["./domain/*"],
          "@application/*": ["./application/*"],
          "@infrastructure/*": ["./infrastructure/*"],
          "@ports/*": ["./ports/*"],
        },
      };
    }
  } catch {
    // fallback
  }

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
  const unresolvableSpecifiers = [];
  const dynamicSpecifiers = [];

  let sf;
  try {
    sf = ts.createSourceFile(sourceFile, content, ts.ScriptTarget.Latest, true);
  } catch {
    return {
      dependencies: [],
      hasDynamicImports: true,
      hasUnresolvableImports: true,
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

  return {
    dependencies: [...dependencies].sort(),
    hasDynamicImports,
    hasUnresolvableImports,
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

export function analyzeTypeScriptImpact({
  repoRoot = findRepoRoot(),
  files = [],
  index = null,
  force = false,
} = {}) {
  const root = path.resolve(repoRoot);
  const normalizedFiles = files.map(normalizePath);

  const impactIndex = index || loadOrBuildTypeScriptImpactIndex({ repoRoot: root, force });
  const knownFiles = impactIndex.files || {};
  const reverseDeps = impactIndex.reverseDependencies || {};

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

  const allConsumers = new Set();
  let isAmbiguous = false;
  let isGlobal = false;
  const flowRootsFound = new Set();
  const flowsFound = new Set();
  const affectedFeatureDomains = new Set();
  const stepConsumers = new Set();

  for (const stagedFile of tsFiles) {
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

    const details = knownFiles[stagedFile];
    if (details) {
      if (details.hasDynamicImports || details.hasUnresolvableImports) {
        isAmbiguous = true;
      }
    } else {
      try {
        const full = path.resolve(root, stagedFile);
        if (fs.existsSync(full)) {
          const content = fs.readFileSync(full, "utf8");
          const tsconfigPaths = loadTsConfigPaths(root);
          const liveDetails = extractFileDependencies(content, stagedFile, {
            repoRoot: root,
            tsconfigPaths,
          });
          if (liveDetails.hasDynamicImports || liveDetails.hasUnresolvableImports) {
            isAmbiguous = true;
          }
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

          if (consumer.startsWith("features/") && consumer.endsWith(".ts")) {
            stepConsumers.add(consumer);
            const parts = consumer.split("/");
            if (parts.length > 1) {
              affectedFeatureDomains.add(parts[1]);
            }
          }

          const consumerDetails = knownFiles[consumer];
          if (consumerDetails?.hasDynamicImports || consumerDetails?.hasUnresolvableImports) {
            isAmbiguous = true;
          }
        }
      }
    }
  }

  const distinctFlowCount = flowsFound.size;
  const distinctFeatureCount = Math.max(affectedFeatureDomains.size, distinctFlowCount);

  if (isAmbiguous) {
    return {
      gate: "C",
      reasonCodes: ["AMBIGUOUS_DEPENDENCY_IMPACT"],
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
