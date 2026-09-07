import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  testDelivery,
  validateTestFilePath,
  validateFeatureFilePath,
  validateScenarioName,
  parseTestCounts,
  executeProcessDefault,
} from "../lib/test-delivery.mjs";
import { findRepoRoot } from "../lib/repo-root.mjs";

test("Unit test focalizado válido y exitoso", async () => {
  const repoRoot = findRepoRoot();
  const result = await testDelivery({
    repoRoot,
    mode: "unit",
    testFiles: ["domain/shared/Money.test.ts"],
    force: true,
  });

  assert.strictEqual(result.status, "passed");
  assert.strictEqual(result.mode, "unit");
  assert.strictEqual(result.cached, false);
  assert.strictEqual(typeof result.durationMs, "number");
  assert.ok(result.durationMs > 0);
  assert.ok(result.counts && result.counts.passed >= 1);
  assert.strictEqual(result.counts.failed, 0);
  assert.strictEqual(result.failure, undefined);
  assert.deepStrictEqual(result.diagnostics, []);

  // Invariant: never exposes internal command
  assert.strictEqual(result.command, undefined);
  assert.strictEqual(result.rawCommand, undefined);
  assert.ok(!JSON.stringify(result).includes("vitest run"));
});

test("Unit test fallido con respuesta compacta", async () => {
  const repoRoot = findRepoRoot();

  // Test failure via injected runner simulating a failed test run
  const mockExecute = async () => ({
    passed: false,
    timedOut: false,
    exitCode: 1,
    durationMs: 120,
    rawOutput: `
FAIL domain/shared/Pricing.test.ts > Pricing > calculate
AssertionError: expected 500 to be 200
  at domain/shared/Pricing.test.ts:42:15

Test Files  1 failed (1)
     Tests  1 failed | 5 passed (6)
`,
    summaryLines: [
      "FAIL domain/shared/Pricing.test.ts > Pricing > calculate",
      "AssertionError: expected 500 to be 200",
    ],
    locations: ["domain/shared/Pricing.test.ts:42"],
    logPath: ".delivery/runtime/tdd/logs/test-fail.log",
  });

  const result = await testDelivery({
    repoRoot,
    mode: "unit",
    testFiles: ["domain/shared/Money.test.ts"],
    force: true,
    executeFn: mockExecute,
  });

  assert.strictEqual(result.status, "failed");
  assert.strictEqual(result.mode, "unit");
  assert.ok(result.failure);
  assert.strictEqual(result.failure.exitCode, 1);
  assert.ok(result.failure.summaryLines.length <= 6);
  assert.deepStrictEqual(result.failure.locations, ["domain/shared/Pricing.test.ts:42"]);
  assert.strictEqual(result.counts.failed, 1);
  assert.strictEqual(result.counts.passed, 5);
  assert.ok(result.diagnostics.some((d) => d.code === "TEST_FAILED"));

  // Invariant: never exposes internal raw command
  assert.strictEqual(result.command, undefined);
  assert.strictEqual(result.failure.command, undefined);
});

test("Feature completa y escenario concreto", async () => {
  const repoRoot = findRepoRoot();
  let capturedCall = null;

  const mockExecute = async (options) => {
    capturedCall = options;
    return {
      passed: true,
      timedOut: false,
      exitCode: 0,
      durationMs: 250,
      rawOutput: "1 scenario (1 passed)\n5 steps (5 passed)",
      summaryLines: [],
      locations: [],
      logPath: ".delivery/runtime/tdd/logs/test-feature.log",
    };
  };

  // 1. Feature completa
  const featResult = await testDelivery({
    repoRoot,
    mode: "scenario",
    featureFile: "features/search-discovery/landing_page_visualization.feature",
    force: true,
    executeFn: mockExecute,
  });

  assert.strictEqual(featResult.status, "passed");
  assert.strictEqual(featResult.mode, "scenario");
  assert.strictEqual(featResult.counts.passed, 1);
  assert.strictEqual(featResult.counts.failed, 0);
  assert.strictEqual(capturedCall.command, "make");
  assert.deepStrictEqual(capturedCall.args, [
    "test-e2e-managed",
    "E2E_FILE=features/search-discovery/landing_page_visualization.feature",
    "E2E_REQUIRE_SCENARIO=1",
  ]);

  // 2. Escenario concreto
  const scenResult = await testDelivery({
    repoRoot,
    mode: "scenario",
    featureFile: "features/search-discovery/landing_page_visualization.feature",
    scenarioName: "Visualizar servicios destacados",
    force: true,
    executeFn: mockExecute,
  });

  assert.strictEqual(scenResult.status, "passed");
  assert.deepStrictEqual(capturedCall.args, [
    "test-e2e-managed",
    "E2E_FILE=features/search-discovery/landing_page_visualization.feature",
    "E2E_REQUIRE_SCENARIO=1",
    "E2E_NAME=Visualizar servicios destacados",
  ]);

  // Invariant: scenarioName validation rejects newlines
  assert.throws(() => validateScenarioName("Bad\nName"), /illegal control characters/);
});

test("Escenario @wip usa el perfil gestionado y exige ejecución real", async () => {
  const repoRoot = findRepoRoot();
  let capturedCall = null;

  const mockExecute = async (options) => {
    capturedCall = options;
    return {
      passed: true,
      timedOut: false,
      exitCode: 0,
      durationMs: 25,
      rawOutput: "1 scenario (1 passed)",
      summaryLines: [],
      locations: [],
    };
  };

  const result = await testDelivery({
    repoRoot,
    mode: "scenario",
    featureFile: "features/search-discovery/provider_landing_page.feature",
    scenarioName: "03-HPP Verificar trabajos agendados",
    force: true,
    executeFn: mockExecute,
  });

  assert.strictEqual(result.status, "passed");
  assert.ok(capturedCall.args.includes("E2E_PROFILE=wip"));
  assert.ok(capturedCall.args.includes("E2E_REQUIRE_SCENARIO=1"));
  assert.ok(capturedCall.args.includes("E2E_NAME=03-HPP Verificar trabajos agendados"));
});

test("Scenario con cero escenarios ejecutados nunca devuelve verde", async () => {
  const repoRoot = findRepoRoot();
  const result = await testDelivery({
    repoRoot,
    mode: "scenario",
    featureFile: "features/search-discovery/landing_page_visualization.feature",
    force: true,
    executeFn: async () => ({
      passed: true,
      timedOut: false,
      exitCode: 0,
      durationMs: 10,
      rawOutput: "0 scenarios (0 passed)",
      summaryLines: [],
      locations: [],
    }),
  });

  assert.strictEqual(result.status, "failed");
  assert.strictEqual(result.failure.code, "NO_SCENARIOS_EXECUTED");
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "NO_SCENARIOS_EXECUTED"));
});

test("affected con cambio unitario, Cucumber y cambio ambiguo", async () => {
  const repoRoot = findRepoRoot();

  // A) Unit test change resolved
  const unitResult = await testDelivery({
    repoRoot,
    mode: "unit",
    testFiles: ["domain/shared/Money.test.ts"],
    force: true,
    executeFn: async () => ({
      passed: true,
      timedOut: false,
      exitCode: 0,
      durationMs: 50,
      rawOutput: "Tests  1 passed (1)",
      summaryLines: [],
      locations: [],
    }),
  });
  assert.strictEqual(unitResult.status, "passed");
  assert.strictEqual(unitResult.mode, "unit");

  // B) Cucumber feature resolved
  const cukeResult = await testDelivery({
    repoRoot,
    mode: "scenario",
    featureFile: "features/auth-onboarding/login.feature",
    force: true,
    executeFn: async () => ({
      passed: true,
      timedOut: false,
      exitCode: 0,
      durationMs: 50,
      rawOutput: "1 scenario (1 passed)",
      summaryLines: [],
      locations: [],
    }),
  });
  assert.strictEqual(cukeResult.status, "passed");
  assert.strictEqual(cukeResult.mode, "scenario");

  // C) Ambiguous change: when affected runs on unmapped / ambiguous files
  // (mode: "affected" handles ambiguous files gracefully)
  const affectedResult = await testDelivery({
    repoRoot,
    mode: "affected",
    executionMode: "sync",
    force: true,
  });
  assert.ok(["passed", "failed"].includes(affectedResult.status));
  assert.strictEqual(affectedResult.mode, "affected");
  assert.ok(Array.isArray(affectedResult.diagnostics));
});

test("Working tree sin cambios", async () => {
  // Test clean working tree reporting
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-clean-"));
  try {
    const { execFileSync } = await import("node:child_process");
    const cleanEnv = { ...process.env };
    delete cleanEnv.GIT_DIR;
    delete cleanEnv.GIT_WORK_TREE;
    delete cleanEnv.GIT_INDEX_FILE;

    execFileSync("git", ["init"], { cwd: tempDir, env: cleanEnv });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: tempDir, env: cleanEnv });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: tempDir, env: cleanEnv });
    await fs.mkdir(path.join(tempDir, ".delivery"), { recursive: true });
    await fs.copyFile(
      path.resolve(findRepoRoot(), ".delivery", "policy.v1.json"),
      path.join(tempDir, ".delivery", "policy.v1.json")
    );
    execFileSync("git", ["add", ".delivery/policy.v1.json"], { cwd: tempDir, env: cleanEnv });
    execFileSync("git", ["commit", "-m", "init"], { cwd: tempDir, env: cleanEnv });

    const result = await testDelivery({
      repoRoot: tempDir,
      mode: "affected",
      force: true,
    });

    assert.strictEqual(result.status, "passed");
    assert.strictEqual(result.mode, "affected");
    assert.strictEqual(result.counts.passed, 0);
    assert.strictEqual(result.counts.failed, 0);
    assert.strictEqual(result.counts.skipped, 0);
    assert.ok(result.diagnostics.some((d) => d.code === "NO_CHANGES"));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("Ruta fuera del repositorio, traversal, glob y argumento malicioso rechazados", async () => {
  const repoRoot = findRepoRoot();

  // 1. Path traversal
  const traversal = await testDelivery({
    repoRoot,
    mode: "unit",
    testFiles: ["../../../etc/passwd.test.ts"],
  });
  assert.strictEqual(traversal.status, "error");
  assert.strictEqual(traversal.diagnostics[0].code, "PATH_TRAVERSAL");

  // 2. Glob pattern
  const globResult = await testDelivery({
    repoRoot,
    mode: "unit",
    testFiles: ["domain/*.test.ts"],
  });
  assert.strictEqual(globResult.status, "error");
  assert.strictEqual(globResult.diagnostics[0].code, "INVALID_TEST_FILE");

  // 3. Flags / malicious option injection
  const flagResult = await testDelivery({
    repoRoot,
    mode: "unit",
    testFiles: ["--inspect"],
  });
  assert.strictEqual(flagResult.status, "error");
  assert.strictEqual(flagResult.diagnostics[0].code, "INVALID_TEST_FILE");

  // 4. Shell injection attempt
  const injectionResult = await testDelivery({
    repoRoot,
    mode: "unit",
    testFiles: ["domain/shared/Money.test.ts; rm -rf /"],
  });
  assert.strictEqual(injectionResult.status, "error");
  assert.strictEqual(injectionResult.diagnostics[0].code, "INVALID_TEST_FILE");

  // 5. Productive source file instead of test file
  const prodResult = await testDelivery({
    repoRoot,
    mode: "unit",
    testFiles: ["domain/shared/Money.ts"],
  });
  assert.strictEqual(prodResult.status, "error");
  assert.strictEqual(prodResult.diagnostics[0].code, "INVALID_TEST_FILE");

  // 6. Non-existent test file
  const nonExistent = await testDelivery({
    repoRoot,
    mode: "unit",
    testFiles: ["domain/shared/NonExistent.test.ts"],
  });
  assert.strictEqual(nonExistent.status, "error");
  assert.strictEqual(nonExistent.diagnostics[0].code, "TEST_FILE_NOT_FOUND");

  // 7. Feature file validation
  const invalidFeature = await testDelivery({
    repoRoot,
    mode: "scenario",
    featureFile: "features/auth.ts",
  });
  assert.strictEqual(invalidFeature.status, "error");
  assert.strictEqual(invalidFeature.diagnostics[0].code, "INVALID_FEATURE_FILE");

  const nonExistentFeature = await testDelivery({
    repoRoot,
    mode: "scenario",
    featureFile: "features/does_not_exist.feature",
  });
  assert.strictEqual(nonExistentFeature.status, "error");
  assert.strictEqual(nonExistentFeature.diagnostics[0].code, "FEATURE_FILE_NOT_FOUND");
});

test("checkId desconocido o no publicado rechazado", async () => {
  const repoRoot = findRepoRoot();

  const result = await testDelivery({
    repoRoot,
    mode: "diagnostic",
    checkId: "unregistered_custom_check",
  });

  assert.strictEqual(result.status, "error");
  assert.strictEqual(result.mode, "diagnostic");
  assert.strictEqual(result.checkId, "unregistered_custom_check");
  assert.ok(result.diagnostics.some((d) => d.code === "UNKNOWN_CHECK"));
  assert.ok(result.diagnostics[0].message.includes("Published catalog checks"));
});

test("Diagnostic conserva counts, código y logPath del check ejecutado", async () => {
  const repoRoot = findRepoRoot();
  const result = await testDelivery({
    repoRoot,
    mode: "diagnostic",
    checkId: "unit",
    force: true,
    executeFn: async ({ logPath }) => ({
      passed: false,
      timedOut: false,
      exitCode: 1,
      durationMs: 15,
      rawOutput: "Tests  2 failed | 3 passed (5)",
      summaryLines: ["FAIL domain/user.test.ts > load"],
      locations: ["domain/user.test.ts:25"],
      counts: { passed: 3, failed: 2, skipped: 0 },
      code: "CHECK_FAILED",
      message: "two unit tests failed",
      logPath,
    }),
  });

  assert.strictEqual(result.status, "failed");
  assert.deepStrictEqual(result.counts, { passed: 3, failed: 2, skipped: 0 });
  assert.strictEqual(result.failure.code, "CHECK_FAILED");
  assert.ok(result.logPath.endsWith(".log"));
  assert.strictEqual(result.failure.logPath, result.logPath);
});

test("Timeout y terminación de procesos hijos", async () => {
  const repoRoot = findRepoRoot();

  const result = await testDelivery({
    repoRoot,
    mode: "unit",
    testFiles: ["domain/shared/Money.test.ts"],
    force: true,
    timeoutMs: 1, // 1 ms guarantees timeout triggers
    executeFn: executeProcessDefault,
  });

  assert.strictEqual(result.status, "failed");
  assert.ok(result.diagnostics.some((d) => d.code === "CHECK_TIMEOUT"));
  assert.strictEqual(result.failure.exitCode, null);
  assert.ok(result.failure.message.includes("timed out"));
});

test("Redacción de secretos", async () => {
  const repoRoot = findRepoRoot();

  const mockExecute = async () => ({
    passed: false,
    timedOut: false,
    exitCode: 1,
    durationMs: 50,
    rawOutput: `
Error: failure with Authorization: Bearer secret-token-xyz-12345
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
Password was password=SuperSecretPassword123!
API Key was sk-1234567890abcdef1234567890
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y3...
-----END RSA PRIVATE KEY-----
`,
    summaryLines: [
      "Error: failure with Authorization: Bearer secret-token-xyz-12345",
      "Password was password=SuperSecretPassword123!",
      "API Key was sk-1234567890abcdef1234567890",
    ],
    locations: [],
    logPath: ".delivery/runtime/tdd/logs/secret-test.log",
  });

  const result = await testDelivery({
    repoRoot,
    mode: "unit",
    testFiles: ["domain/shared/Money.test.ts"],
    force: true,
    executeFn: mockExecute,
  });

  assert.strictEqual(result.status, "failed");

  // Verify all secrets are redacted in message and summary lines
  const fullText = JSON.stringify(result);
  assert.ok(!fullText.includes("secret-token-xyz-12345"));
  assert.ok(!fullText.includes("eyJhbGciOiJIUzI1Ni"));
  assert.ok(!fullText.includes("SuperSecretPassword123!"));
  assert.ok(!fullText.includes("sk-1234567890abcdef1234567890"));
  assert.ok(!fullText.includes("MIIEowIBAAKCAQEA0Y3"));

  assert.ok(fullText.includes("[REDACTED]"));
});

test("Caché idéntica y su invalidación tras editar una entrada", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-cache-test-"));
  try {
    const dummyTestFile = path.join(tempDir, "sample.test.ts");
    const productionFile = path.join(tempDir, "src", "production.ts");
    await fs.writeFile(dummyTestFile, "export const a = 1;", "utf8");
    await fs.mkdir(path.dirname(productionFile), { recursive: true });
    await fs.writeFile(productionFile, "export const value = 1;", "utf8");

    let executionCount = 0;
    const mockExecute = async () => {
      executionCount++;
      return {
        passed: true,
        timedOut: false,
        exitCode: 0,
        durationMs: 40,
        rawOutput: "Tests 1 passed (1)",
        summaryLines: [],
        locations: [],
      };
    };

    // 1. First execution -> cached: false
    const res1 = await testDelivery({
      repoRoot: tempDir,
      mode: "unit",
      testFiles: ["sample.test.ts"],
      executeFn: mockExecute,
    });
    assert.strictEqual(res1.status, "passed");
    assert.strictEqual(res1.cached, false);
    assert.strictEqual(executionCount, 1);

    // 2. Identical execution -> cached: true, no re-execution
    const res2 = await testDelivery({
      repoRoot: tempDir,
      mode: "unit",
      testFiles: ["sample.test.ts"],
      executeFn: mockExecute,
    });
    assert.strictEqual(res2.status, "passed");
    assert.strictEqual(res2.cached, true);
    assert.strictEqual(executionCount, 1);

    // 3. Edit production input without changing the test path -> invalidates cache
    await fs.writeFile(productionFile, "export const value = 2; // modified", "utf8");

    const res3 = await testDelivery({
      repoRoot: tempDir,
      mode: "unit",
      testFiles: ["sample.test.ts"],
      executeFn: mockExecute,
    });
    assert.strictEqual(res3.status, "passed");
    assert.strictEqual(res3.cached, false);
    assert.strictEqual(executionCount, 2);

    // 4. Edit test file -> invalidates cache as well
    await fs.writeFile(dummyTestFile, "export const a = 2; // modified", "utf8");

    const res4 = await testDelivery({
      repoRoot: tempDir,
      mode: "unit",
      testFiles: ["sample.test.ts"],
      executeFn: mockExecute,
    });
    assert.strictEqual(res4.status, "passed");
    assert.strictEqual(res4.cached, false);
    assert.strictEqual(executionCount, 3);

    // 5. Force flag re-executes even if file is unchanged
    const res5 = await testDelivery({
      repoRoot: tempDir,
      mode: "unit",
      testFiles: ["sample.test.ts"],
      force: true,
      executeFn: mockExecute,
    });
    assert.strictEqual(res5.status, "passed");
    assert.strictEqual(res5.cached, false);
    assert.strictEqual(executionCount, 4);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("Caché de scenario se invalida al cambiar steps/support aunque el feature no cambie", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-scenario-cache-"));
  try {
    const featurePath = path.join(tempDir, "features", "sample.feature");
    const stepPath = path.join(tempDir, "features", "sample.steps.ts");
    await fs.mkdir(path.dirname(featurePath), { recursive: true });
    await fs.writeFile(
      featurePath,
      "Feature: Sample\n\nScenario: Works\n  Given a sample\n",
      "utf8"
    );
    await fs.writeFile(stepPath, "export const stepVersion = 1;\n", "utf8");

    let executionCount = 0;
    const mockExecute = async () => {
      executionCount += 1;
      return {
        passed: true,
        timedOut: false,
        exitCode: 0,
        durationMs: 10,
        rawOutput: "1 scenario (1 passed)",
        summaryLines: [],
        locations: [],
      };
    };

    const first = await testDelivery({
      repoRoot: tempDir,
      mode: "scenario",
      featureFile: "features/sample.feature",
      force: false,
      executeFn: mockExecute,
    });
    assert.strictEqual(first.status, "passed");
    assert.strictEqual(first.cached, false);

    const second = await testDelivery({
      repoRoot: tempDir,
      mode: "scenario",
      featureFile: "features/sample.feature",
      force: false,
      executeFn: mockExecute,
    });
    assert.strictEqual(second.cached, true);
    assert.strictEqual(executionCount, 1);

    await fs.writeFile(stepPath, "export const stepVersion = 2;\n", "utf8");
    const third = await testDelivery({
      repoRoot: tempDir,
      mode: "scenario",
      featureFile: "features/sample.feature",
      force: false,
      executeFn: mockExecute,
    });
    assert.strictEqual(third.status, "passed");
    assert.strictEqual(third.cached, false);
    assert.strictEqual(executionCount, 2);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("Confirmar que nunca se crea receipt consumible por hooks", async () => {
  const repoRoot = findRepoRoot();
  const receiptsDir = path.resolve(repoRoot, ".delivery/runtime/receipts");

  // Read existing receipts if any
  let beforeReceipts = [];
  try {
    beforeReceipts = await fs.readdir(receiptsDir);
  } catch {
    // receipts dir may not exist
  }

  // Execute delivery_test
  const result = await testDelivery({
    repoRoot,
    mode: "unit",
    testFiles: ["domain/shared/Money.test.ts"],
    force: true,
  });
  assert.strictEqual(result.status, "passed");

  // Check receipts dir after
  let afterReceipts = [];
  try {
    afterReceipts = await fs.readdir(receiptsDir);
  } catch {
    // still doesn't exist
  }

  assert.deepStrictEqual(
    afterReceipts.sort(),
    beforeReceipts.sort(),
    "delivery_test must NEVER create receipts in .delivery/runtime/receipts"
  );

  // Verify runtime evidence exists in .delivery/runtime/tdd/
  const tddDir = path.resolve(repoRoot, ".delivery/runtime/tdd");
  const tddExists = await fs.stat(tddDir).then(() => true).catch(() => false);
  assert.ok(tddExists, ".delivery/runtime/tdd/ directory should be used for TDD artifacts");
});

test("parseTestCounts: correctly handles Vitest, Node, and Cucumber formats", () => {
  const vitestPassed = parseTestCounts("Tests  10 passed (10)");
  assert.strictEqual(vitestPassed.found, true);
  assert.strictEqual(vitestPassed.counts.passed, 10);
  assert.strictEqual(vitestPassed.counts.failed, 0);

  const vitestFailed = parseTestCounts("Tests  2 failed | 8 passed (10)");
  assert.strictEqual(vitestFailed.found, true);
  assert.strictEqual(vitestFailed.counts.passed, 8);
  assert.strictEqual(vitestFailed.counts.failed, 2);

  const nodeTest = parseTestCounts("ℹ pass 15\nℹ fail 3\nℹ skipped 1");
  assert.strictEqual(nodeTest.found, true);
  assert.strictEqual(nodeTest.counts.passed, 15);
  assert.strictEqual(nodeTest.counts.failed, 3);
  assert.strictEqual(nodeTest.counts.skipped, 1);

  const cucumberTest = parseTestCounts("1 scenario (1 passed)\n5 steps (5 passed)");
  assert.strictEqual(cucumberTest.found, true);
  assert.strictEqual(cucumberTest.counts.passed, 1);
  assert.strictEqual(cucumberTest.counts.failed, 0);
});
