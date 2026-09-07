import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { executeCheck, resolveCheck } from "../lib/execute-check.mjs";
import {
  parseDiagnostics,
  stripAnsi,
  extractLocations,
  deduplicateLines,
  parseVitestDiagnostics,
  parseCucumberDiagnostics,
  parseTscDiagnostics,
  parseEslintDiagnostics,
  parseNextBuildDiagnostics,
  computeFailureSignature,
} from "../lib/parse-diagnostics.mjs";
import { redactSecrets } from "../lib/redact-secrets.mjs";
import { validateExecutionResult } from "../lib/validate-schema.mjs";
import { findRepoRoot } from "../lib/repo-root.mjs";
import { runGate } from "../lib/run-gate.mjs";
import { testDelivery } from "../lib/test-delivery.mjs";

test("Fallback executeCheck: proceso con exit 1 y stdout/stderr completamente vacío produce Process exited with code 1 sin crashear", async (t) => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-diag-empty-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));

  // Invocamos un comando permitido que sale con código 1 sin escribir output
  const check = {
    id: "unit",
    kind: "command",
    label: "Unit tests",
    command: "npm",
    args: ["run", "test"],
    timeoutMs: 10000,
  };

  const parsed = parseDiagnostics({
    check,
    command: check.command,
    args: check.args,
    output: "",
    exitCode: 1,
    signal: null,
    timedOut: false,
    error: null,
  });

  assert.strictEqual(parsed.passed, false);
  assert.strictEqual(parsed.code, "CHECK_FAILED");
  assert.deepStrictEqual(parsed.summaryLines, ["Process exited with code 1"]);
  assert.strictEqual(parsed.message, "Process exited with code 1");
  assert.deepStrictEqual(parsed.locations, []);
});

test("Fallback executeCheck: proceso con whitespace-only produce Process exited with code", () => {
  const parsed = parseDiagnostics({
    command: "npm",
    args: ["run", "lint"],
    output: "   \n\t  \n  ",
    exitCode: 2,
    signal: null,
    timedOut: false,
    error: null,
  });

  assert.strictEqual(parsed.passed, false);
  assert.strictEqual(parsed.code, "CHECK_FAILED");
  assert.deepStrictEqual(parsed.summaryLines, ["Process exited with code 2"]);
  assert.strictEqual(parsed.message, "Process exited with code 2");
});

test("Fallback executeCheck: proceso terminado con signal genera Process terminated with signal", () => {
  const parsed = parseDiagnostics({
    command: "npm",
    args: ["run", "test"],
    output: "",
    exitCode: null,
    signal: "SIGKILL",
    timedOut: false,
    error: null,
  });

  assert.strictEqual(parsed.passed, false);
  assert.strictEqual(parsed.code, "CHECK_FAILED");
  assert.deepStrictEqual(parsed.summaryLines, ["Process terminated with signal SIGKILL"]);
  assert.strictEqual(parsed.message, "Process terminated with signal SIGKILL");
});

test("Fallback executeCheck: error al iniciar proceso produce CHECK_START_FAILED", () => {
  const parsed = parseDiagnostics({
    command: "npm",
    args: ["run", "test"],
    output: "",
    exitCode: null,
    signal: null,
    timedOut: false,
    error: new Error("spawn ENOENT"),
  });

  assert.strictEqual(parsed.passed, false);
  assert.strictEqual(parsed.code, "CHECK_START_FAILED");
  assert.ok(parsed.message.includes("ENOENT"));
  assert.deepStrictEqual(parsed.summaryLines, ["spawn ENOENT"]);
});

test("Fallback executeCheck: timeout produce CHECK_TIMEOUT", () => {
  const parsed = parseDiagnostics({
    check: { id: "unit", label: "Unit tests" },
    command: "npm",
    args: ["run", "test"],
    output: "running slow test...",
    exitCode: null,
    signal: null,
    timedOut: true,
    error: null,
  });

  assert.strictEqual(parsed.passed, false);
  assert.strictEqual(parsed.code, "CHECK_TIMEOUT");
  assert.ok(parsed.message.includes("timed out"));
  assert.strictEqual(parsed.summaryLines[0], "Unit tests timed out");
});

test("Parser usa el output tail cuando el log fue truncado", () => {
  const parsed = parseDiagnostics({
    check: { id: "unit", label: "Unit tests" },
    command: "npm",
    args: ["run", "test"],
    output: "early output\n[delivery runner truncated this log]",
    outputTail: [
      "FAIL domain/billing/invoice.test.ts > Invoice > calculateTotal",
      "AssertionError: expected 1500 to be 1000",
      " ❯ domain/billing/invoice.test.ts:78:20",
      "Tests  1 failed | 49 passed (50)",
    ].join("\n"),
    outputTruncated: true,
    exitCode: 1,
  });

  assert.strictEqual(parsed.passed, false);
  assert.strictEqual(parsed.code, "CHECK_FAILED");
  assert.ok(parsed.message.includes("Invoice > calculateTotal"));
  assert.ok(parsed.locations.includes("domain/billing/invoice.test.ts:78"));
  assert.deepStrictEqual(parsed.counts, { passed: 49, failed: 1, skipped: 0 });
});

test("Proceso con salida solo en stderr captura y extrae diagnóstico adecuadamente", async (t) => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-diag-stderr-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));

  const rawStderr = [
    "Error: ECONNREFUSED 127.0.0.1:5432",
    "    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1607:16)",
    "    at domain/database/client.ts:45:10",
  ].join("\n");

  const parsed = parseDiagnostics({
    command: "npm",
    args: ["run", "test"],
    output: rawStderr,
    exitCode: 1,
    signal: null,
    timedOut: false,
    error: null,
  });

  assert.strictEqual(parsed.passed, false);
  assert.strictEqual(parsed.code, "CHECK_FAILED");
  assert.ok(parsed.summaryLines.some((l) => l.includes("ECONNREFUSED")));
  assert.ok(parsed.locations.includes("domain/database/client.ts:45"));
  // Stacktrace interno debe ser filtrado
  assert.ok(!parsed.summaryLines.some((l) => l.includes("TCPConnectWrap")));
});

test("Limpieza: secuencias ANSI, stacktraces extensos, duplicados y secretos", () => {
  const secretJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  const rawOutput = [
    "\u001b[31m\u001b[1mFAIL\u001b[22m\u001b[39m domain/auth.test.ts > login",
    `Authorization: Bearer my-secret-token-12345 with token=${secretJwt}`,
    "Error: invalid authentication response",
    "Error: invalid authentication response", // Duplicado
    "Error: invalid authentication response", // Duplicado
    "    at Object.<anonymous> (/repo/domain/auth.test.ts:42:15)",
    "    at node:internal/process/task_queues:95:5",
    "    at /repo/node_modules/vitest/dist/index.js:100:20",
    "⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯",
    "Tests  1 failed (1)",
  ].join("\n");

  const parsed = parseDiagnostics({
    command: "npm",
    args: ["run", "test"],
    output: rawOutput,
    exitCode: 1,
  });

  // ANSI eliminado
  for (const line of parsed.summaryLines) {
    assert.strictEqual(stripAnsi(line), line);
  }

  // Secretos redactados
  assert.ok(!JSON.stringify(parsed).includes("my-secret-token-12345"));
  assert.ok(!JSON.stringify(parsed).includes("eyJhbGciOiJIUzI1Ni"));

  // Stacktraces extensos eliminados
  assert.ok(!parsed.summaryLines.some((l) => l.startsWith("at ")));
  assert.ok(!parsed.summaryLines.some((l) => l.includes("node:internal")));
  assert.ok(!parsed.summaryLines.some((l) => l.includes("node_modules")));

  // Duplicados removidos
  const authErrCount = parsed.summaryLines.filter((l) => l.includes("invalid authentication response")).length;
  assert.strictEqual(authErrCount, 1);
});

test("Fixture Vitest: extrae archivo/test fallido, conteos passed/failed y primer assertion mismatch", () => {
  const vitestOutput = `
⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯

 FAIL  components/Auth.test.tsx > AuthForm > renders invalid credentials error
AssertionError: expected 'Error: Invalid user' to deeply equal 'Error: Invalid password' // Object.is equality

- Expected
+ Received

- Error: Invalid password
+ Error: Invalid user

 ❯ components/Auth.test.tsx:45:18
     43|     await userEvent.click(submitBtn);
     44|     const error = screen.getByRole('alert');
     45|     expect(error.textContent).toBe('Error: Invalid password');
       |                               ^
     46|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  1 failed | 4 passed (5)
   Start at  22:00:00
   Duration  350ms
`;

  const parsed = parseVitestDiagnostics(vitestOutput);

  assert.strictEqual(parsed.family, "vitest");
  assert.strictEqual(parsed.testFile, "components/Auth.test.tsx");
  assert.strictEqual(parsed.testName, "AuthForm > renders invalid credentials error");
  assert.strictEqual(parsed.counts.failed, 1);
  assert.strictEqual(parsed.counts.passed, 4);
  assert.ok(parsed.assertionMismatch.includes("expected 'Error: Invalid user' to deeply equal 'Error: Invalid password'"));
  assert.ok(parsed.locations.includes("components/Auth.test.tsx:45"));
  assert.ok(parsed.summaryLines.length <= 6);
  assert.ok(parsed.summaryLines[0].includes("components/Auth.test.tsx"));
});

test("Fixture Cucumber: escenario, step, ubicación .feature:line y conteos", () => {
  const cucumberOutput = `
Failures:

1) Scenario: Client accepts quotation # features/quotation/accept.feature:14
   ✖ When the client clicks the accept button # features/quotation/steps/quote.steps.ts:32
       Error: Payment gateway unavailable: connection timeout
           at World.<anonymous> (features/quotation/steps/quote.steps.ts:34:15)

3 scenarios (1 failed, 2 passed)
12 steps (1 failed, 2 skipped, 9 passed)
0m01.234s (executing steps: 0m00.890s)
`;

  const parsed = parseCucumberDiagnostics(cucumberOutput);

  assert.strictEqual(parsed.family, "cucumber");
  assert.strictEqual(parsed.scenarioName, "Client accepts quotation");
  assert.strictEqual(parsed.stepText, "When the client clicks the accept button");
  assert.strictEqual(parsed.counts.failed, 1);
  assert.strictEqual(parsed.counts.passed, 2);
  assert.ok(parsed.locations.includes("features/quotation/accept.feature:14"));
  assert.ok(parsed.locations.includes("features/quotation/steps/quote.steps.ts:32"));
  assert.ok(parsed.summaryLines.some((l) => l.includes("Client accepts quotation")));
  assert.ok(parsed.summaryLines.some((l) => l.includes("When the client clicks the accept button")));
  assert.ok(parsed.summaryLines.some((l) => l.includes("Payment gateway unavailable")));
});

test("Fixture TypeScript (tsc): primeros códigos de error TS... y ubicaciones únicas", () => {
  const tscOutput = `
components/checkout/PaymentForm.tsx(28,14): error TS2339: Property 'cardToken' does not exist on type 'PaymentDetails'.
domain/billing/invoice.ts:15:3 - error TS2322: Type 'string' is not assignable to type 'number'.
domain/billing/invoice.ts:40:9 - error TS2304: Cannot find name 'calculateTaxRate'.
`;

  const parsed = parseTscDiagnostics(tscOutput);

  assert.strictEqual(parsed.family, "tsc");
  assert.deepStrictEqual(parsed.errorCodes, ["TS2339", "TS2322", "TS2304"]);
  assert.ok(parsed.locations.includes("components/checkout/PaymentForm.tsx:28"));
  assert.ok(parsed.locations.includes("domain/billing/invoice.ts:15"));
  assert.ok(parsed.locations.includes("domain/billing/invoice.ts:40"));
  assert.strictEqual(parsed.counts.failed, 3);
  assert.ok(parsed.message.includes("TS2339"));
});

test("Fixture ESLint: archivos/reglas infringidas y conteos", () => {
  const eslintOutput = `
/home/user/loresuelvo-webapp/components/header.tsx
  14:7   error    'session' is assigned a value but never used  @typescript-eslint/no-unused-vars
  22:12  warning  Unexpected console statement                  no-console

/home/user/loresuelvo-webapp/domain/user.ts
  8:1    error    Missing return type on function               @typescript-eslint/explicit-function-return-type

✖ 3 problems (2 errors, 1 warning)
  0 errors and 0 warnings potentially fixable with the \`--fix\` option.
`;

  const parsed = parseEslintDiagnostics(eslintOutput);

  assert.strictEqual(parsed.family, "eslint");
  assert.ok(parsed.rules.includes("@typescript-eslint/no-unused-vars"));
  assert.ok(parsed.rules.includes("@typescript-eslint/explicit-function-return-type"));
  assert.ok(parsed.locations.includes("components/header.tsx:14"));
  assert.ok(parsed.locations.includes("domain/user.ts:8"));
  assert.strictEqual(parsed.counts.failed, 2);
  assert.ok(parsed.summaryLines.length <= 6);
});

test("Fixture Next.js build: fase y primer error causal", () => {
  const buildOutput = `
   ▲ Next.js 15.1.0
   - Environments: .env.local

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/8) ...

Error: Page "/profile" is missing exported default React component.
    at generateStaticRoutes (/node_modules/next/dist/build/index.js:123:45)
    at async build (/node_modules/next/dist/build/index.js:456:78)

> Build error occurred
Error: Export encountered errors on following paths:
	/profile: /profile
`;

  const parsed = parseNextBuildDiagnostics(buildOutput);

  assert.strictEqual(parsed.family, "next_build");
  assert.strictEqual(parsed.phase, "Static page generation");
  assert.ok(parsed.causalError.includes('Page "/profile" is missing exported default'));
  assert.ok(parsed.message.includes("Static page generation"));
  assert.ok(parsed.summaryLines.some((l) => l.includes("Static page generation")));
  assert.ok(parsed.summaryLines.some((l) => l.includes("missing exported default")));
});

test("Éxito con output masivo produce respuesta compacta sin volcar stdout crudo", () => {
  // Simular salida masiva de 500 tests exitosos
  const massLines = [];
  for (let i = 1; i <= 500; i++) {
    massLines.push(`✔ domain/test_${i}.test.ts > passed test ${i} (${i * 2}ms)`);
  }
  massLines.push("Tests  500 passed (500)");
  massLines.push("Duration  4.5s");
  const massiveOutput = massLines.join("\n");

  const parsed = parseDiagnostics({
    command: "npm",
    args: ["run", "test"],
    output: massiveOutput,
    exitCode: 0,
    signal: null,
    timedOut: false,
    error: null,
  });

  assert.strictEqual(parsed.passed, true);
  assert.strictEqual(parsed.code, null);
  assert.strictEqual(parsed.message, null);
  assert.deepStrictEqual(parsed.summaryLines, []);
  assert.deepStrictEqual(parsed.locations, []);
  assert.strictEqual(parsed.counts.passed, 500);
  assert.strictEqual(parsed.counts.failed, 0);

  // Invariante: no debe tener la salida masiva en la respuesta
  assert.strictEqual(parsed.rawOutput, undefined);
  assert.ok(JSON.stringify(parsed).length < 200);
});

test("Fallo con output masivo conserva causa causal, locations y límites sin volcar el traceback", () => {
  const massLines = [];
  massLines.push("FAIL domain/billing/invoice.test.ts > Invoice > calculateTotal");
  massLines.push("AssertionError: expected 1500 to be 1000");
  massLines.push(" ❯ domain/billing/invoice.test.ts:78:20");
  for (let i = 1; i <= 300; i++) {
    massLines.push(`    at InternalCallStack.frame_${i} (/repo/node_modules/lib/frame_${i}.js:${i}:10)`);
  }
  massLines.push("Tests  1 failed | 49 passed (50)");
  const massiveOutput = massLines.join("\n");

  const parsed = parseDiagnostics({
    command: "npm",
    args: ["run", "test"],
    output: massiveOutput,
    exitCode: 1,
    signal: null,
    timedOut: false,
    error: null,
  });

  assert.strictEqual(parsed.passed, false);
  assert.strictEqual(parsed.code, "CHECK_FAILED");
  assert.ok(parsed.message.includes("Invoice > calculateTotal"));
  assert.ok(parsed.locations.includes("domain/billing/invoice.test.ts:78"));
  assert.ok(parsed.summaryLines.length <= 6);
  // Asegura que no se filtró la masa de stack frames
  assert.ok(!parsed.summaryLines.some((l) => l.includes("frame_")));
  assert.ok(JSON.stringify(parsed).length < 1000);
});

test("runGate produce failure con signature, code, checkId, message, locations, summaryLines, attemptCount, logPath", async (t) => {
  const repoRoot = findRepoRoot();
  const mockExecute = async ({ logPath }) => ({
    id: "unit",
    status: "failed",
    durationMs: 45,
    exitCode: 1,
    summaryLines: [
      "FAIL domain/user.test.ts > User > load",
      "AssertionError: expected false to be true",
    ],
    locations: ["domain/user.test.ts:25"],
    counts: { passed: 0, failed: 1, skipped: 0 },
    logPath,
    diagnostic: {
      code: "CHECK_FAILED",
      checkId: "unit",
      message: "FAIL domain/user.test.ts > User > load: expected false to be true",
      retryable: true,
      file: "domain/user.test.ts",
      line: 25,
    },
  });

  const inspection = {
    schemaVersion: 1,
    snapshotHash: "a".repeat(64),
    repository: { branch: "main", headSha: "b".repeat(40), usId: "US-01" },
    policy: { version: 1, hash: "c".repeat(64) },
    gate: {
      id: "A",
      reasonCodes: ["ISOLATED_PRODUCTION"],
      checkIds: ["unit"],
      parameters: {},
      postPushChecks: [],
    },
    diagnostics: [],
  };

  const snapshot = {
    snapshotHash: "a".repeat(64),
    branch: "main",
    headSha: "b".repeat(40),
    cacheable: false,
  };

  const policy = {
    version: 1,
    hash: "c".repeat(64),
    limits: { maxDiagnostics: 20, maxFailureSummaryLines: 6 },
    checkCatalog: {
      unit: { kind: "command", label: "Unit", command: "npm", args: ["run", "test"], timeoutMs: 10000 },
    },
  };

  const result = await runGate({
    inspection,
    snapshot,
    policy,
    repoRoot,
    executeCheck: mockExecute,
    force: true,
  });

  assert.strictEqual(result.status, "failed");
  assert.ok(result.failure);
  assert.strictEqual(result.failure.checkId, "unit");
  assert.strictEqual(result.failure.code, "CHECK_FAILED");
  assert.strictEqual(result.failure.exitCode, 1);
  assert.ok(result.failure.signature);
  assert.strictEqual(typeof result.failure.signature, "string");
  assert.deepStrictEqual(result.failure.locations, ["domain/user.test.ts:25"]);
  assert.ok(result.failure.summaryLines.length <= 6);
  assert.strictEqual(result.failure.attemptCount, 1);
  assert.ok(result.failure.logPath.endsWith(".log"));

  // Invariante: Schema valida 100% verde
  assert.doesNotThrow(() => validateExecutionResult(result, repoRoot));
});
