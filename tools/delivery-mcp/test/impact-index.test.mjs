import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildCucumberImpactIndex,
  loadOrBuildCucumberImpactIndex,
  analyzeCucumberImpact,
  isCacheValid,
  extractStepsFromFeature,
  extractStepDefinitionsFromSource,
  findReachableSupportFiles,
  CUCUMBER_IMPACT_INDEX_PATH,
} from "../lib/impact-index.mjs";

async function createTempFixtureRepo(t) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cucumber-impact-test-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));

  // Create structure
  await fs.mkdir(path.join(repoRoot, "features", "support"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, "features", "auth"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, "features", "orders"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, "features", "steps"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, "infrastructure", "api"), { recursive: true });

  // 1. Support files
  await fs.writeFile(
    path.join(repoRoot, "features", "support", "hooks.ts"),
    `import { CustomWorld } from "./world";\n// hooks\n`,
    "utf8"
  );
  await fs.writeFile(
    path.join(repoRoot, "features", "support", "world.ts"),
    `import { helper } from "../../infrastructure/api/client";\nexport class CustomWorld {}\n`,
    "utf8"
  );
  await fs.writeFile(
    path.join(repoRoot, "infrastructure", "api", "client.ts"),
    `export const helper = true;\n`,
    "utf8"
  );

  // 2. Feature files
  await fs.writeFile(
    path.join(repoRoot, "features", "auth", "login.feature"),
    `Feature: Login
Scenario: Successful login
  Given que no inicié sesión en Auth0
  When hago clic en el botón "Iniciar Sesión"
  Then veo mi nombre "Andres" en el encabezado
`,
    "utf8"
  );

  await fs.writeFile(
    path.join(repoRoot, "features", "orders", "checkout.feature"),
    `Feature: Checkout
Scenario: Checkout order
  Given que no inicié sesión en Auth0
  When procedo al checkout
  Then veo la confirmación
`,
    "utf8"
  );

  // 3. Step definitions:
  // - auth_steps.ts:
  //   - "que no inicié sesión en Auth0" -> used by login.feature AND checkout.feature (shared!)
  //   - "hago clic en el botón {string}" -> used by login.feature
  //   - "veo mi nombre {string} en el encabezado" -> used by login.feature
  await fs.writeFile(
    path.join(repoRoot, "features", "auth", "auth_steps.ts"),
    `import { Given, When, Then } from "@cucumber/cucumber";
Given("que no inicié sesión en Auth0", async function () {});
When("hago clic en el botón {string}", async function (btn: string) {});
Then("veo mi nombre {string} en el encabezado", async function (name: string) {});
`,
    "utf8"
  );

  // - checkout_steps.ts:
  //   - "procedo al checkout" -> used ONLY by checkout.feature (single feature consumer)
  //   - "veo la confirmación" -> used ONLY by checkout.feature
  await fs.writeFile(
    path.join(repoRoot, "features", "orders", "checkout_steps.ts"),
    `import { When, Then } from "@cucumber/cucumber";
When("procedo al checkout", async function () {});
Then("veo la confirmación", async function () {});
`,
    "utf8"
  );

  // - unused_steps.ts:
  //   - steps never consumed by any feature
  await fs.writeFile(
    path.join(repoRoot, "features", "steps", "unused_steps.ts"),
    `import { Given } from "@cucumber/cucumber";
Given("un paso que nunca se usa en ningun escenario", async function () {});
`,
    "utf8"
  );

  // - ambiguous_steps.ts:
  //   - dynamic argument or malformed expression
  await fs.writeFile(
    path.join(repoRoot, "features", "steps", "ambiguous_steps.ts"),
    `import { Given } from "@cucumber/cucumber";
const DYNAMIC = "algo";
Given(DYNAMIC, async function () {});
`,
    "utf8"
  );

  return repoRoot;
}

test("impact-index: extrae steps de features y definiciones de steps con precisión", async (t) => {
  const repoRoot = await createTempFixtureRepo(t);

  const featureContent = await fs.readFile(
    path.join(repoRoot, "features", "auth", "login.feature"),
    "utf8"
  );
  const steps = extractStepsFromFeature(featureContent, "features/auth/login.feature");
  assert.strictEqual(steps.length, 3);
  assert.strictEqual(steps[0].keyword, "Given");
  assert.strictEqual(steps[0].text, "que no inicié sesión en Auth0");
  assert.strictEqual(steps[0].scenario, "Successful login");
  assert.strictEqual(steps[1].keyword, "When");
  assert.strictEqual(steps[1].text, 'hago clic en el botón "Iniciar Sesión"');

  const stepDefContent = await fs.readFile(
    path.join(repoRoot, "features", "auth", "auth_steps.ts"),
    "utf8"
  );
  const defs = extractStepDefinitionsFromSource(stepDefContent, "features/auth/auth_steps.ts");
  assert.strictEqual(defs.length, 3);
  assert.strictEqual(defs[0].pattern, "que no inicié sesión en Auth0");
  assert.strictEqual(defs[0].patternType, "cucumber_expression");
  assert.strictEqual(defs[1].pattern, "hago clic en el botón {string}");
});

test("impact-index: identifica archivos de soporte y dependencias alcanzables", async (t) => {
  const repoRoot = await createTempFixtureRepo(t);

  const { supportFiles, reachableFiles } = findReachableSupportFiles(repoRoot);
  assert.ok(supportFiles.includes("features/support/hooks.ts"));
  assert.ok(supportFiles.includes("features/support/world.ts"));
  assert.ok(reachableFiles.includes("features/support/hooks.ts"));
  assert.ok(reachableFiles.includes("features/support/world.ts"));
  assert.ok(reachableFiles.includes("infrastructure/api/client.ts"));
});

test("impact-index: construye y guarda el índice regenerable correctamente", async (t) => {
  const repoRoot = await createTempFixtureRepo(t);

  const index = buildCucumberImpactIndex({ repoRoot });
  assert.strictEqual(index.schemaVersion, 1);
  assert.strictEqual(index.summary.totalFeatures, 2);
  assert.ok(index.summary.totalSteps >= 6);
  assert.ok(index.summary.totalStepDefinitions >= 6);
  assert.ok(index.fileHashes["features/auth/login.feature"]);
  assert.ok(index.fileHashes["features/auth/auth_steps.ts"]);
  assert.ok(index.fileHashes["features/support/hooks.ts"]);

  const sharedDef = index.stepDefinitions.find((d) => d.pattern === "que no inicié sesión en Auth0");
  assert.ok(sharedDef);
  assert.strictEqual(sharedDef.consumerFeatures.length, 2);
  assert.ok(sharedDef.consumerFeatures.includes("features/auth/login.feature"));
  assert.ok(sharedDef.consumerFeatures.includes("features/orders/checkout.feature"));

  const singleDef = index.stepDefinitions.find((d) => d.pattern === "procedo al checkout");
  assert.ok(singleDef);
  assert.strictEqual(singleDef.consumerFeatures.length, 1);
  assert.strictEqual(singleDef.consumerFeatures[0], "features/orders/checkout.feature");

  const unusedDef = index.stepDefinitions.find((d) => d.pattern.includes("nunca se usa"));
  assert.ok(unusedDef);
  assert.strictEqual(unusedDef.consumerFeatures.length, 0);

  // Verify file was written to disk
  const written = JSON.parse(
    await fs.readFile(path.join(repoRoot, CUCUMBER_IMPACT_INDEX_PATH), "utf8")
  );
  assert.strictEqual(written.schemaVersion, 1);
  assert.strictEqual(written.summary.totalFeatures, 2);
});

test("impact-index: validación de caché por hashes e invalidación automática al modificar archivos", async (t) => {
  const repoRoot = await createTempFixtureRepo(t);

  // First build
  const index1 = buildCucumberImpactIndex({ repoRoot });
  assert.strictEqual(isCacheValid({ repoRoot, cachedIndex: index1 }), true);

  // loadOrBuild uses cache
  const loaded1 = loadOrBuildCucumberImpactIndex({ repoRoot });
  assert.strictEqual(loaded1.generatedAt, index1.generatedAt);

  // Modify a step file content (change step definition body, not expression)
  await fs.appendFile(
    path.join(repoRoot, "features", "auth", "auth_steps.ts"),
    "\n// modified body\n",
    "utf8"
  );
  assert.strictEqual(isCacheValid({ repoRoot, cachedIndex: index1 }), false);

  // loadOrBuild automatically regenerates the cache
  const regenerated = loadOrBuildCucumberImpactIndex({ repoRoot });
  assert.notStrictEqual(regenerated.generatedAt, index1.generatedAt);
  assert.notStrictEqual(
    regenerated.fileHashes["features/auth/auth_steps.ts"],
    index1.fileHashes["features/auth/auth_steps.ts"]
  );
});

test("impact-index: invalidación de caché cuando se agrega un nuevo archivo de feature o step", async (t) => {
  const repoRoot = await createTempFixtureRepo(t);

  const index1 = buildCucumberImpactIndex({ repoRoot });
  assert.strictEqual(isCacheValid({ repoRoot, cachedIndex: index1 }), true);

  // Add a new feature file
  await fs.writeFile(
    path.join(repoRoot, "features", "auth", "new.feature"),
    "Feature: New\nScenario: X\nGiven que no inicié sesión en Auth0\n",
    "utf8"
  );

  assert.strictEqual(isCacheValid({ repoRoot, cachedIndex: index1 }), false);
});

test("impact-index: analyzeCucumberImpact clasifica correctamente soporte, compartidos, únicos, nuevos y ambiguos", async (t) => {
  const repoRoot = await createTempFixtureRepo(t);

  // 1. Modificar features/support/hooks.ts -> Gate C (GLOBAL_CUCUMBER_SUPPORT_CHANGED)
  const impactHooks = analyzeCucumberImpact({
    repoRoot,
    files: ["features/support/hooks.ts"],
  });
  assert.strictEqual(impactHooks.gate, "C");
  assert.deepStrictEqual(impactHooks.reasonCodes, ["GLOBAL_CUCUMBER_SUPPORT_CHANGED"]);
  assert.strictEqual(impactHooks.confidence, "high");

  // 1b. Modificar dependencia alcanzable de soporte -> Gate C (GLOBAL_CUCUMBER_SUPPORT_CHANGED)
  const impactClient = analyzeCucumberImpact({
    repoRoot,
    files: ["infrastructure/api/client.ts"],
  });
  assert.strictEqual(impactClient.gate, "C");
  assert.deepStrictEqual(impactClient.reasonCodes, ["GLOBAL_CUCUMBER_SUPPORT_CHANGED"]);

  // 2. Modificar step compartido por múltiples features -> Gate C (SHARED_STEP_CONSUMERS)
  const impactShared = analyzeCucumberImpact({
    repoRoot,
    files: ["features/auth/auth_steps.ts"],
  });
  assert.strictEqual(impactShared.gate, "C");
  assert.deepStrictEqual(impactShared.reasonCodes, ["SHARED_STEP_CONSUMERS"]);
  assert.strictEqual(impactShared.affectedFeatures, 2);
  assert.strictEqual(impactShared.confidence, "high");

  // 3. Modificar step consumido por una única feature -> Gate B (SINGLE_FEATURE_STEP_CONSUMER)
  const impactSingle = analyzeCucumberImpact({
    repoRoot,
    files: ["features/orders/checkout_steps.ts"],
  });
  assert.strictEqual(impactSingle.gate, "B");
  assert.deepStrictEqual(impactSingle.reasonCodes, ["SINGLE_FEATURE_STEP_CONSUMER"]);
  assert.strictEqual(impactSingle.affectedFeatures, 1);
  assert.strictEqual(impactSingle.parameters?.featureFile, "features/orders/checkout.feature");
  assert.strictEqual(impactSingle.confidence, "high");

  // 4. Modificar step no consumido por ninguna feature -> Gate 0 (NEW_STEP_NO_CONSUMERS)
  const impactUnused = analyzeCucumberImpact({
    repoRoot,
    files: ["features/steps/unused_steps.ts"],
  });
  assert.strictEqual(impactUnused.gate, "0");
  assert.deepStrictEqual(impactUnused.reasonCodes, ["NEW_STEP_NO_CONSUMERS"]);
  assert.strictEqual(impactUnused.affectedFeatures, 0);
  assert.strictEqual(impactUnused.consumerCount, 0);
  assert.strictEqual(impactUnused.confidence, "high");

  // 5. Modificar step ambiguo o dinámico -> Gate C (AMBIGUOUS_STEP_IMPACT, confidence low)
  const impactAmbiguous = analyzeCucumberImpact({
    repoRoot,
    files: ["features/steps/ambiguous_steps.ts"],
  });
  assert.strictEqual(impactAmbiguous.gate, "C");
  assert.deepStrictEqual(impactAmbiguous.reasonCodes, ["AMBIGUOUS_STEP_IMPACT"]);
  assert.strictEqual(impactAmbiguous.confidence, "low");

  // 6. Modificar solo archivo feature sin steps -> Gate NONE
  const impactOnlyFeature = analyzeCucumberImpact({
    repoRoot,
    files: ["features/auth/login.feature"],
  });
  assert.strictEqual(impactOnlyFeature.gate, "NONE");
  assert.strictEqual(impactOnlyFeature.affectedFeatures, 1);
});

test("impact-index: eliminación de step consumido por una feature -> Gate B (DELETED_STEP_SINGLE_FEATURE_CONSUMER)", async (t) => {
  const repoRoot = await createTempFixtureRepo(t);
  const baseIndex = buildCucumberImpactIndex({ repoRoot });

  // Delete definition "procedo al checkout" from checkout_steps.ts (consumed only by checkout.feature)
  await fs.writeFile(
    path.join(repoRoot, "features", "orders", "checkout_steps.ts"),
    `import { Then } from "@cucumber/cucumber";\nThen("veo la confirmación", async function () {});\n`,
    "utf8"
  );

  const impact = analyzeCucumberImpact({
    repoRoot,
    files: ["features/orders/checkout_steps.ts"],
    baseIndex,
  });

  assert.strictEqual(impact.gate, "B");
  assert.deepStrictEqual(impact.reasonCodes, ["DELETED_STEP_SINGLE_FEATURE_CONSUMER"]);
  assert.strictEqual(impact.affectedFeatures, 1);
  assert.strictEqual(impact.parameters?.featureFile, "features/orders/checkout.feature");
  assert.strictEqual(impact.confidence, "high");
});

test("impact-index: eliminación de step consumido por múltiples features -> Gate C (DELETED_SHARED_STEP_CONSUMERS)", async (t) => {
  const repoRoot = await createTempFixtureRepo(t);
  const baseIndex = buildCucumberImpactIndex({ repoRoot });

  // Delete shared definition "que no inicié sesión en Auth0" (consumed by login.feature AND checkout.feature)
  await fs.writeFile(
    path.join(repoRoot, "features", "auth", "auth_steps.ts"),
    `import { When, Then } from "@cucumber/cucumber";\nWhen("hago clic en el botón {string}", async function (btn: string) {});\nThen("veo mi nombre {string} en el encabezado", async function (name: string) {});\n`,
    "utf8"
  );

  const impact = analyzeCucumberImpact({
    repoRoot,
    files: ["features/auth/auth_steps.ts"],
    baseIndex,
  });

  assert.strictEqual(impact.gate, "C");
  assert.deepStrictEqual(impact.reasonCodes, ["DELETED_SHARED_STEP_CONSUMERS"]);
  assert.strictEqual(impact.affectedFeatures, 2);
  assert.strictEqual(impact.confidence, "high");
});

test("impact-index: eliminación de archivo de steps consumido por una feature -> Gate B", async (t) => {
  const repoRoot = await createTempFixtureRepo(t);
  const baseIndex = buildCucumberImpactIndex({ repoRoot });

  // Delete entire file checkout_steps.ts
  await fs.unlink(path.join(repoRoot, "features", "orders", "checkout_steps.ts"));

  const impact = analyzeCucumberImpact({
    repoRoot,
    files: ["features/orders/checkout_steps.ts"],
    baseIndex,
  });

  assert.strictEqual(impact.gate, "B");
  assert.deepStrictEqual(impact.reasonCodes, ["DELETED_STEP_SINGLE_FEATURE_CONSUMER"]);
  assert.strictEqual(impact.affectedFeatures, 1);
  assert.strictEqual(impact.parameters?.featureFile, "features/orders/checkout.feature");
});

test("impact-index: eliminación de archivo de steps consumido por múltiples features -> Gate C", async (t) => {
  const repoRoot = await createTempFixtureRepo(t);
  const baseIndex = buildCucumberImpactIndex({ repoRoot });

  // Delete entire file auth_steps.ts
  await fs.unlink(path.join(repoRoot, "features", "auth", "auth_steps.ts"));

  const impact = analyzeCucumberImpact({
    repoRoot,
    files: ["features/auth/auth_steps.ts"],
    baseIndex,
  });

  assert.strictEqual(impact.gate, "C");
  assert.deepStrictEqual(impact.reasonCodes, ["DELETED_SHARED_STEP_CONSUMERS"]);
  assert.strictEqual(impact.affectedFeatures, 2);
});

test("impact-index: reemplazo de regex/texto evalúa impacto de definición anterior y nueva", async (t) => {
  const repoRoot = await createTempFixtureRepo(t);
  const baseIndex = buildCucumberImpactIndex({ repoRoot });

  // Replace step in checkout_steps.ts with a new pattern
  await fs.writeFile(
    path.join(repoRoot, "features", "orders", "checkout_steps.ts"),
    `import { When, Then } from "@cucumber/cucumber";\nWhen("procedo al checkout", async function () {});\nThen("veo la confirmación modificada", async function () {});\n`,
    "utf8"
  );

  const impact = analyzeCucumberImpact({
    repoRoot,
    files: ["features/orders/checkout_steps.ts"],
    baseIndex,
  });

  assert.strictEqual(impact.gate, "B");
  assert.strictEqual(impact.parameters?.featureFile, "features/orders/checkout.feature");
});

test("impact-index: archivo de steps eliminado con índice base no reconstruible -> Gate C (AMBIGUOUS_STEP_IMPACT)", async (t) => {
  const repoRoot = await createTempFixtureRepo(t);

  // Delete step file without base index
  await fs.unlink(path.join(repoRoot, "features", "orders", "checkout_steps.ts"));

  const impact = analyzeCucumberImpact({
    repoRoot,
    files: ["features/orders/checkout_steps.ts"],
    baseIndex: null,
  });

  assert.strictEqual(impact.gate, "C");
  assert.deepStrictEqual(impact.reasonCodes, ["AMBIGUOUS_STEP_IMPACT"]);
  assert.strictEqual(impact.confidence, "low");
});

test("impact-index: índice base corrupto -> Gate C (AMBIGUOUS_STEP_IMPACT)", async (t) => {
  const repoRoot = await createTempFixtureRepo(t);

  const impact = analyzeCucumberImpact({
    repoRoot,
    files: ["features/orders/checkout_steps.ts"],
    baseIndex: { corrupt: true },
  });

  assert.strictEqual(impact.gate, "C");
  assert.deepStrictEqual(impact.reasonCodes, ["AMBIGUOUS_STEP_IMPACT"]);
  assert.strictEqual(impact.confidence, "low");
});
