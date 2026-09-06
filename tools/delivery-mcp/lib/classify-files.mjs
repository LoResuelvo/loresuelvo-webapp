import path from "node:path";

export function normalizePath(filePath) {
  return filePath.split(path.sep).join("/").replace(/^\.\//, "");
}

export function isProductionSourceFile(normalizedPath) {
  const extension = path.extname(normalizedPath);
  const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
  const excludedParts = new Set([
    ".agents",
    ".next",
    "node_modules",
    "reports",
    ".cucumber-dist",
    ".delivery",
    ".codex",
    "tools",
  ]);
  const isTest = /(?:^|\/)(?:features\/|.*\.(?:test|spec)\.[cm]?[jt]sx?$)/.test(normalizedPath);

  if (!sourceExtensions.has(extension)) return false;
  if (normalizedPath.endsWith(".d.ts")) return false;
  if (isTest) return false;

  const parts = normalizedPath.split("/");
  if (parts.some((part) => excludedParts.has(part))) return false;

  return true;
}

const HUMAN_ONLY_PATTERNS = [
  /^Dockerfile(?:\..*)?$/i,
  /^\.dockerignore$/i,
  /^docker\//i,
  /^(?:docker-)?compose.*\.ya?ml$/i,
  /^\.github\/workflows\/.*docker.*\.ya?ml$/i,
  /(?:^|\/)docker[-_].*\.(?:sh|bash|mjs|js|ts)$/i,
  /(?:^|\/)build[-_]image.*\.(?:sh|bash|mjs|js|ts)$/i,
];

export function isHumanOnlyPath(filePath) {
  const normalized = normalizePath(filePath);
  const base = path.basename(normalized);
  return (
    HUMAN_ONLY_PATTERNS.some((pat) => pat.test(normalized) || pat.test(base))
  );
}

function matchesRule(normalized, match = {}) {
  if ((match.exact || []).includes(normalized)) return true;
  if ((match.prefixes || []).some((prefix) => normalized.startsWith(prefix))) return true;
  if (
    (match.extensions || []).some((extension) =>
      normalized.toLowerCase().endsWith(extension.toLowerCase())
    )
  ) {
    return true;
  }
  return (match.patterns || []).some((pattern) => new RegExp(pattern).test(normalized));
}

function materializeClassification(definition, normalized) {
  const isHumanOnly = definition.category === "human_only" || isHumanOnlyPath(normalized);
  return {
    category: isHumanOnly ? "human_only" : definition.category,
    isGateCTrigger: definition.isGateCTrigger,
    isGate0Trigger: definition.isGate0Trigger,
    isHumanOnly,
    isProductSource:
      definition.productSource === "auto"
        ? isProductionSourceFile(normalized)
        : definition.productSource,
  };
}

export function classifyFile(filePath, policy) {
  const normalized = normalizePath(filePath);
  const classification = policy?.classification;
  if (!classification?.rules || !classification?.fallback) {
    throw new Error("Delivery policy does not define file classification rules");
  }

  const rule = classification.rules.find((candidate) =>
    matchesRule(normalized, candidate.match)
  );
  if (!rule && isProductionSourceFile(normalized)) {
    return {
      category: "isolated_production",
      isGateCTrigger: false,
      isGate0Trigger: false,
      isProductSource: true,
    };
  }
  return materializeClassification(rule || classification.fallback, normalized);
}

export function isDeliveryControlPlanePath(filePath, policy) {
  return classifyFile(filePath, policy).category === "delivery_tooling";
}

export function classifyFiles(files = [], policy) {
  const result = {
    all: [],
    hasGateCTrigger: false,
    hasGate0Trigger: false,
    hasIsolatedProduction: false,
    hasDeliveryTooling: false,
    hasHumanOnly: false,
    hasOnlyGate0: false,
    hasOnlyDocsOrConfig: false,
    productFiles: [],
  };

  if (!files || files.length === 0) {
    return result;
  }

  let countGate0 = 0;
  let countDocsConfig = 0;

  for (const file of files) {
    const classification = classifyFile(file, policy);
    result.all.push({ file, ...classification });

    if (classification.isHumanOnly) result.hasHumanOnly = true;
    if (classification.isGateCTrigger) result.hasGateCTrigger = true;
    if (classification.isGate0Trigger) {
      result.hasGate0Trigger = true;
      countGate0++;
    }
    if (classification.category === "isolated_production") {
      result.hasIsolatedProduction = true;
    }
    if (classification.category === "delivery_tooling") {
      result.hasDeliveryTooling = true;
    }
    if (classification.category === "non_code_docs_tests_config" || classification.category === "test") {
      countDocsConfig++;
    }
    if (classification.isProductSource) result.productFiles.push(file);
  }

  if (countGate0 === files.length) result.hasOnlyGate0 = true;
  if (countDocsConfig === files.length) result.hasOnlyDocsOrConfig = true;

  return result;
}
