import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildTypeScriptImpactIndex,
  loadOrBuildTypeScriptImpactIndex,
  analyzeTypeScriptImpact,
  isTypeScriptCacheValid,
  extractFileDependencies,
  resolveImportSpecifier,
  TYPESCRIPT_IMPACT_INDEX_PATH,
} from "../lib/dependency-impact.mjs";

async function createTempFixtureRepo(t) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ts-impact-test-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));

  // tsconfig.json with aliases
  await fs.writeFile(
    path.join(repoRoot, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@/*": ["./*"],
            "@domain/*": ["./domain/*"],
            "@application/*": ["./application/*"],
            "@infrastructure/*": ["./infrastructure/*"],
            "@ports/*": ["./ports/*"],
          },
        },
      },
      null,
      2
    ),
    "utf8"
  );

  return repoRoot;
}

test("dependency-impact: componente consumido por un único flujo", async (t) => {
  const repoRoot = await createTempFixtureRepo(t);

  // Component
  await fs.mkdir(path.join(repoRoot, "components", "profile"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "components", "profile", "card.tsx"),
    `export function Card() { return <div>Card</div>; }\n`,
    "utf8"
  );

  // Single page consumer: app/consumidor/home/page.tsx
  await fs.mkdir(path.join(repoRoot, "app", "consumidor", "home"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "app", "consumidor", "home", "page.tsx"),
    `import { Card } from "@/components/profile/card";\nexport default function Page() { return <Card />; }\n`,
    "utf8"
  );

  const result = analyzeTypeScriptImpact({
    repoRoot,
    files: ["components/profile/card.tsx"],
  });

  assert.strictEqual(result.gate, "A");
  assert.ok(result.reasonCodes.includes("SINGLE_FLOW_CONSUMER"));
  assert.strictEqual(result.consumerCount, 1);
  assert.strictEqual(result.affectedFeatures, 1);
  assert.strictEqual(result.confidence, "high");
});

test("dependency-impact: componente compartido por dos rutas / flujos (debe dar Gate C)", async (t) => {
  const repoRoot = await createTempFixtureRepo(t);

  // Shared component
  await fs.mkdir(path.join(repoRoot, "components", "shared"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "components", "shared", "badge.tsx"),
    `export function Badge() { return <span>Badge</span>; }\n`,
    "utf8"
  );

  // Route 1: app/consumidor/home/page.tsx
  await fs.mkdir(path.join(repoRoot, "app", "consumidor", "home"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "app", "consumidor", "home", "page.tsx"),
    `import { Badge } from "@/components/shared/badge";\nexport default function Page() { return <Badge />; }\n`,
    "utf8"
  );

  // Route 2: app/prestador/home/page.tsx
  await fs.mkdir(path.join(repoRoot, "app", "prestador", "home"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "app", "prestador", "home", "page.tsx"),
    `import { Badge } from "@/components/shared/badge";\nexport default function Page() { return <Badge />; }\n`,
    "utf8"
  );

  const result = analyzeTypeScriptImpact({
    repoRoot,
    files: ["components/shared/badge.tsx"],
  });

  assert.strictEqual(result.gate, "C");
  assert.ok(result.reasonCodes.includes("MULTIPLE_FLOW_CONSUMERS"));
  assert.strictEqual(result.consumerCount, 2);
  assert.strictEqual(result.affectedFeatures, 2);
  assert.strictEqual(result.confidence, "high");
});

test("dependency-impact: carpeta compartida con nombre desconocido para la política (evaluada por dependencias)", async (t) => {
  const repoRoot = await createTempFixtureRepo(t);

  // Brand new directory unknown to policy: "widgets/toast.tsx"
  await fs.mkdir(path.join(repoRoot, "widgets"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "widgets", "toast.tsx"),
    `export function Toast() { return <div>Toast</div>; }\n`,
    "utf8"
  );

  // Route 1: app/onboarding/page.tsx
  await fs.mkdir(path.join(repoRoot, "app", "onboarding"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "app", "onboarding", "page.tsx"),
    `import { Toast } from "@/widgets/toast";\nexport default function Page() { return <Toast />; }\n`,
    "utf8"
  );

  // Route 2: app/consumidor/buscar/page.tsx
  await fs.mkdir(path.join(repoRoot, "app", "consumidor", "buscar"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "app", "consumidor", "buscar", "page.tsx"),
    `import { Toast } from "@/widgets/toast";\nexport default function Page() { return <Toast />; }\n`,
    "utf8"
  );

  const result = analyzeTypeScriptImpact({
    repoRoot,
    files: ["widgets/toast.tsx"],
  });

  assert.strictEqual(result.gate, "C");
  assert.ok(result.reasonCodes.includes("MULTIPLE_FLOW_CONSUMERS"));
  assert.strictEqual(result.consumerCount, 2);
  assert.strictEqual(result.affectedFeatures, 2);
  assert.strictEqual(result.confidence, "high");
});

test("dependency-impact: reexport mediante barrel (index.ts)", async (t) => {
  const repoRoot = await createTempFixtureRepo(t);

  // Component inside folder
  await fs.mkdir(path.join(repoRoot, "components", "buttons"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "components", "buttons", "primary-button.tsx"),
    `export function PrimaryButton() { return <button>Primary</button>; }\n`,
    "utf8"
  );

  // Barrel: components/buttons/index.ts
  await fs.writeFile(
    path.join(repoRoot, "components", "buttons", "index.ts"),
    `export * from "./primary-button";\n`,
    "utf8"
  );

  // Consumer: app/consumidor/home/page.tsx imports from barrel
  await fs.mkdir(path.join(repoRoot, "app", "consumidor", "home"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "app", "consumidor", "home", "page.tsx"),
    `import { PrimaryButton } from "@/components/buttons";\nexport default function Page() { return <PrimaryButton />; }\n`,
    "utf8"
  );

  const result = analyzeTypeScriptImpact({
    repoRoot,
    files: ["components/buttons/primary-button.tsx"],
  });

  // Reexport reaches page.tsx through index.ts barrel
  assert.strictEqual(result.consumerCount, 2);
  assert.strictEqual(result.gate, "A");
  assert.ok(result.reasonCodes.includes("SINGLE_FLOW_CONSUMER"));
  assert.strictEqual(result.confidence, "high");
});

test("dependency-impact: resolución de alias de TypeScript (@/* y @domain/*)", async (t) => {
  const repoRoot = await createTempFixtureRepo(t);

  // Domain model
  await fs.mkdir(path.join(repoRoot, "domain", "user"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "domain", "user", "user.ts"),
    `export interface User { id: string; name: string; }\n`,
    "utf8"
  );

  // Consumer importing via @domain/*
  await fs.mkdir(path.join(repoRoot, "app", "onboarding"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "app", "onboarding", "page.tsx"),
    `import type { User } from "@domain/user/user";\nexport default function Page() { return <div>User</div>; }\n`,
    "utf8"
  );

  const result = analyzeTypeScriptImpact({
    repoRoot,
    files: ["domain/user/user.ts"],
  });

  assert.strictEqual(result.consumerCount, 1);
  assert.strictEqual(result.confidence, "high");
  assert.strictEqual(result.gate, "A");
});

test("dependency-impact: import dinámico o relación no resoluble seleccionando Gate C", async (t) => {
  const repoRoot = await createTempFixtureRepo(t);

  // File A: has dynamic import()
  await fs.mkdir(path.join(repoRoot, "components", "dynamic"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "components", "dynamic", "loader.tsx"),
    `export async function loadWidget() {\n  const mod = await import("./widget");\n  return mod;\n}\n`,
    "utf8"
  );
  await fs.writeFile(
    path.join(repoRoot, "components", "dynamic", "widget.tsx"),
    `export function Widget() { return <div>Dynamic Widget</div>; }\n`,
    "utf8"
  );

  const dynamicResult = analyzeTypeScriptImpact({
    repoRoot,
    files: ["components/dynamic/loader.tsx"],
  });

  assert.strictEqual(dynamicResult.gate, "C");
  assert.ok(dynamicResult.reasonCodes.includes("AMBIGUOUS_DEPENDENCY_IMPACT"));
  assert.strictEqual(dynamicResult.confidence, "low");

  // File B: has unresolvable local import
  await fs.mkdir(path.join(repoRoot, "components", "broken"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "components", "broken", "unresolved.tsx"),
    `import { missing } from "./missing-file";\nexport function Broken() { return <div>{missing}</div>; }\n`,
    "utf8"
  );

  const unresolvedResult = analyzeTypeScriptImpact({
    repoRoot,
    files: ["components/broken/unresolved.tsx"],
  });

  assert.strictEqual(unresolvedResult.gate, "C");
  assert.ok(unresolvedResult.reasonCodes.includes("AMBIGUOUS_DEPENDENCY_IMPACT"));
  assert.strictEqual(unresolvedResult.confidence, "low");
});

test("dependency-impact: layout o provider global selecciona Gate C", async (t) => {
  const repoRoot = await createTempFixtureRepo(t);

  // Helper used in app/layout.tsx
  await fs.mkdir(path.join(repoRoot, "components", "header"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "components", "header", "navbar.tsx"),
    `export function Navbar() { return <nav>Navbar</nav>; }\n`,
    "utf8"
  );

  await fs.mkdir(path.join(repoRoot, "app"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "app", "layout.tsx"),
    `import { Navbar } from "@/components/header/navbar";\nexport default function RootLayout() { return <html><body><Navbar /></body></html>; }\n`,
    "utf8"
  );

  const result = analyzeTypeScriptImpact({
    repoRoot,
    files: ["components/header/navbar.tsx"],
  });

  assert.strictEqual(result.gate, "C");
  assert.ok(result.reasonCodes.includes("GLOBAL_LAYOUT_OR_PROVIDER"));
  assert.strictEqual(result.confidence, "high");
});

test("dependency-impact: validación de caché e invalidación automática", async (t) => {
  const repoRoot = await createTempFixtureRepo(t);

  await fs.mkdir(path.join(repoRoot, "domain", "item"), { recursive: true });
  const itemPath = path.join(repoRoot, "domain", "item", "item.ts");
  await fs.writeFile(itemPath, `export const item = "v1";\n`, "utf8");

  // Build index
  const index1 = loadOrBuildTypeScriptImpactIndex({ repoRoot });
  assert.ok(isTypeScriptCacheValid({ repoRoot, cachedIndex: index1 }));

  // Modify file
  await fs.writeFile(itemPath, `export const item = "v2";\n`, "utf8");
  assert.strictEqual(isTypeScriptCacheValid({ repoRoot, cachedIndex: index1 }), false);

  // Rebuild
  const index2 = loadOrBuildTypeScriptImpactIndex({ repoRoot });
  assert.ok(isTypeScriptCacheValid({ repoRoot, cachedIndex: index2 }));
  assert.notStrictEqual(index1.fileHashes["domain/item/item.ts"], index2.fileHashes["domain/item/item.ts"]);
});
