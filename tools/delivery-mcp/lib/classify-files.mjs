import path from "node:path";

const SHARED_COMPONENT_DIRS = ["ui", "shared", "common", "layouts", "modal"];

export function normalizePath(filePath) {
  return filePath.split(path.sep).join("/").replace(/^\.\//, "");
}

export function classifyFile(filePath) {
  const normalized = normalizePath(filePath);

  if (
    normalized.startsWith("tools/delivery-mcp/") ||
    (/^\.delivery\/.*\.json$/.test(normalized)) ||
    normalized === "package.json"
  ) {
    return {
      category: "delivery_tooling",
      isGateCTrigger: false,
      isGate0Trigger: false,
      isProductSource: false,
    };
  }

  // 1. Features, steps, and cucumber support
  if (
    normalized.startsWith("features/") ||
    normalized === "cucumber.json" ||
    normalized === "tsconfig.cucumber.json"
  ) {
    return {
      category: "features_steps_cucumber",
      isGateCTrigger: false,
      isGate0Trigger: true,
      isProductSource: false,
    };
  }

  // 2. Routing and layouts
  if (
    /^app\/(?:.*\/)?(?:page|layout|route|loading|error|not-found|template|default)\.[cm]?[jt]sx?$/.test(normalized) ||
    normalized.startsWith("lib/routes/") ||
    normalized === "lib/routes.ts"
  ) {
    return {
      category: "routing_layouts",
      isGateCTrigger: true,
      isGate0Trigger: false,
      isProductSource: isProductionSourceFile(normalized),
    };
  }

  // 3. Server Actions
  if (
    /^app\/(?:.*\/)?actions(?:\/.*)?\.[cm]?[jt]sx?$/.test(normalized) ||
    /^application\/(?:.*\/)?actions.*?\.[cm]?[jt]sx?$/.test(normalized)
  ) {
    return {
      category: "server_actions",
      isGateCTrigger: true,
      isGate0Trigger: false,
      isProductSource: isProductionSourceFile(normalized),
    };
  }

  // 4. Auth
  if (
    normalized.startsWith("infrastructure/auth/") ||
    normalized.startsWith("app/api/auth/")
  ) {
    return {
      category: "auth",
      isGateCTrigger: true,
      isGate0Trigger: false,
      isProductSource: isProductionSourceFile(normalized),
    };
  }

  // 5. API client & repositories / Infrastructure
  if (normalized.startsWith("infrastructure/")) {
    return {
      category: "infrastructure",
      isGateCTrigger: true,
      isGate0Trigger: false,
      isProductSource: isProductionSourceFile(normalized),
    };
  }

  // 6. Shared components
  if (normalized.startsWith("components/")) {
    const subPath = normalized.slice("components/".length);
    const topFolder = subPath.split("/")[0];
    if (SHARED_COMPONENT_DIRS.includes(topFolder)) {
      return {
        category: "shared_components",
        isGateCTrigger: true,
        isGate0Trigger: false,
        isProductSource: isProductionSourceFile(normalized),
      };
    }
  }

  // 7. Unit tests
  if (/(?:^|\/).*\.(?:test|spec)\.[cm]?[jt]sx?$/.test(normalized)) {
    return {
      category: "test",
      isGateCTrigger: false,
      isGate0Trigger: false,
      isProductSource: false,
    };
  }

  // 8. Isolated production code (domain, ports, application non-action, isolated components, hooks, lib)
  if (
    normalized.startsWith("domain/") ||
    normalized.startsWith("ports/") ||
    normalized.startsWith("application/") ||
    normalized.startsWith("components/") ||
    normalized.startsWith("hooks/") ||
    normalized.startsWith("lib/")
  ) {
    return {
      category: "isolated_production",
      isGateCTrigger: false,
      isGate0Trigger: false,
      isProductSource: isProductionSourceFile(normalized),
    };
  }

  // 9. Documentation, config, styles, assets, tooling
  return {
    category: "non_code_docs_tests_config",
    isGateCTrigger: false,
    isGate0Trigger: false,
    isProductSource: false,
  };
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

export function classifyFiles(files = []) {
  const result = {
    all: [],
    hasGateCTrigger: false,
    hasGate0Trigger: false,
    hasIsolatedProduction: false,
    hasDeliveryTooling: false,
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
    const classification = classifyFile(file);
    result.all.push({ file, ...classification });

    if (classification.isGateCTrigger) {
      result.hasGateCTrigger = true;
    }
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
    if (classification.isProductSource) {
      result.productFiles.push(file);
    }
  }

  if (countGate0 === files.length) {
    result.hasOnlyGate0 = true;
  }
  if (countDocsConfig === files.length) {
    result.hasOnlyDocsOrConfig = true;
  }

  return result;
}
