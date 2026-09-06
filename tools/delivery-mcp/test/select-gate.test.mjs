import test from "node:test";
import assert from "node:assert/strict";
import { selectGate as selectGateWithPolicy } from "../lib/select-gate.mjs";
import { loadDeliveryPolicy } from "../lib/policy-loader.mjs";

const policy = await loadDeliveryPolicy();

function selectGate(input) {
  return selectGateWithPolicy({ ...input, policy });
}

test("selectGate: sin cambios staged -> Gate NONE y status no_changes", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: { stagedFiles: [] },
  });

  assert.strictEqual(result.gate.id, "NONE");
  assert.strictEqual(result.status, "no_changes");
  assert.deepStrictEqual(result.gate.checks, []);
});

test("selectGate: feature y steps solamente -> Gate 0", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: [
        "features/proposal/accept-proposal.feature",
        "features/proposal/steps/accept-proposal.steps.ts",
      ],
    },
  });

  assert.strictEqual(result.gate.id, "0");
  assert.strictEqual(result.status, "ready");
  assert.deepStrictEqual(result.gate.checks, ["make test-e2e-steps-compatible"]);
});

test("selectGate: dominio/helper aislado -> Gate A", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: [
        "domain/proposal/proposal-status.ts",
        "ports/proposal/proposal-repository.ts",
      ],
    },
  });

  assert.strictEqual(result.gate.id, "A");
  assert.strictEqual(result.status, "ready");
  assert.ok(result.gate.checks.includes("npx --no-install tsc --noEmit"));
});

test("selectGate: cierre de escenario de bajo riesgo con feature única inferida -> Gate B", () => {
  const result = selectGate({
    intent: "close_scenario",
    snapshot: {
      stagedFiles: [
        "features/auth/login.feature",
        "domain/user/user-helper.ts",
      ],
    },
  });

  assert.strictEqual(result.gate.id, "B");
  assert.strictEqual(result.status, "ready");
  assert.deepStrictEqual(result.gate.checks, [
    "make test-e2e-managed E2E_FILE=features/auth/login.feature",
  ]);
});

test("selectGate: cierre de escenario sin feature inferible ni especificada -> status needs_input", () => {
  const result = selectGate({
    intent: "close_scenario",
    snapshot: {
      stagedFiles: [
        "domain/user/user-helper.ts",
      ],
    },
  });

  assert.strictEqual(result.gate.id, "B");
  assert.strictEqual(result.status, "needs_input");
  assert.ok(result.diagnostics.some((d) => d.code === "MISSING_FEATURE_FOR_GATE_B"));
});

test("selectGate: Gate B rechaza multiples features aunque se declare una explicitamente", () => {
  const result = selectGate({
    intent: "close_scenario",
    featureFile: "features/auth/login.feature",
    snapshot: {
      stagedFiles: ["features/auth/login.feature", "features/auth/logout.feature"],
    },
  });

  assert.strictEqual(result.gate.id, "B");
  assert.strictEqual(result.status, "needs_input");
  assert.ok(result.diagnostics.some((d) => d.code === "AMBIGUOUS_FEATURE_FOR_GATE_B"));
});

test("selectGate: Server Action, layout, routing, auth, API o componente compartido -> Gate C", () => {
  const cases = [
    ["app/proposals/page.tsx"],
    ["app/proposals/layout.tsx"],
    ["app/proposals/actions.ts"],
    ["infrastructure/auth/auth-client.ts"],
    ["infrastructure/api/api-client.ts"],
    ["infrastructure/repositories/order-repository.ts"],
    ["components/ui/button.tsx"],
    ["components/shared/header.tsx"],
  ];

  for (const [file] of cases) {
    const result = selectGate({
      intent: "prepare_commit",
      snapshot: { stagedFiles: [file] },
    });

    assert.strictEqual(
      result.gate.id,
      "C",
      `Expected file ${file} to trigger Gate C, got ${result.gate.id}`
    );
    assert.strictEqual(result.status, "ready");
    assert.ok(result.gate.checks.includes("npm run lint"));
    assert.ok(result.gate.checks.includes("make test-e2e-managed"));
  }
});

test("selectGate: cierre de batch o US -> Gate D", () => {
  const batchResult = selectGate({
    intent: "close_batch",
    scopeFiles: ["features/order/order.feature"],
    snapshot: {
      stagedFiles: ["domain/order/order.ts"],
    },
  });
  assert.strictEqual(batchResult.gate.id, "D");
  assert.strictEqual(batchResult.status, "ready");
  assert.ok(batchResult.gate.checkIds.includes("no_wip_in_scope"));
  assert.deepStrictEqual(batchResult.gate.postPushChecks, ["ci_green"]);

  const usResult = selectGate({
    intent: "close_us",
    scopeFiles: ["features/order/order.feature"],
    snapshot: {
      stagedFiles: ["domain/order/order.ts"],
    },
  });
  assert.strictEqual(usResult.gate.id, "D");
  assert.strictEqual(usResult.status, "ready");
});

test("selectGate: cierre de escenario de alto riesgo -> Gate D", () => {
  const result = selectGate({
    intent: "close_scenario",
    featureFile: "features/provider/provider-reviews.feature",
    snapshot: {
      stagedFiles: [
        "features/provider/provider-reviews.feature",
        "infrastructure/repositories/provider-repository.ts",
      ],
    },
  });

  assert.strictEqual(result.gate.id, "D");
  assert.strictEqual(result.status, "ready");
  assert.deepStrictEqual(result.gate.reasonCodes, ["INTENT_CLOSE_HIGH_RISK_SCENARIO"]);
});

test("selectGate: documentación o configuración solamente -> Gate NONE", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: [
        "AGENTS.md",
        "docs/architecture.md",
        ".delivery/README.md",
      ],
    },
  });

  assert.strictEqual(result.gate.id, "NONE");
  assert.strictEqual(result.status, "ready");
  assert.deepStrictEqual(result.gate.checks, []);
});

test("selectGate: cambios del delivery runner ejecutan sus tests en Gate A", () => {
  const cases = [
    ".delivery/policy.v1.json",
    "tools/delivery-mcp/lib/run-gate.mjs",
    ".githooks/pre-push",
    ".codex/delivery-guard.mjs",
    ".github/workflows/ci.yml",
    "Makefile",
  ];

  for (const file of cases) {
    const result = selectGate({
      intent: "prepare_commit",
      snapshot: { stagedFiles: [file] },
    });
    assert.strictEqual(result.gate.id, "A", `${file} must receive Gate A`);
    assert.ok(result.gate.checkIds.includes("delivery_unit"));
    assert.ok(result.gate.reasonCodes.includes("DELIVERY_TOOLING_CHANGED"));
  }
});

test("selectGate: rutas runtime y desconocidas fallan hacia Gate C", () => {
  for (const file of ["middleware.ts", "next.config.mjs", "scripts/release.sh"]) {
    const result = selectGate({ intent: "prepare_commit", snapshot: { stagedFiles: [file] } });
    assert.strictEqual(result.gate.id, "C", `${file} must fail closed to Gate C`);
  }
});

test("selectGate: diff mixto -> gate de mayor cobertura", () => {
  // Mixed Gate C (shared component) + Gate A (domain) -> C
  const mix1 = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: [
        "domain/proposal/proposal.ts",
        "components/ui/button.tsx",
      ],
    },
  });
  assert.strictEqual(mix1.gate.id, "C");

  // Mixed Gate A (domain) + Gate 0 (steps) -> A
  const mix2 = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: [
        "domain/proposal/proposal.ts",
        "features/proposal/steps/proposal.steps.ts",
      ],
    },
  });
  assert.strictEqual(mix2.gate.id, "A");
  assert.ok(mix2.gate.checks.includes("npx --no-install tsc --project tsconfig.cucumber.json --noEmit"));

  // Mixed Gate C + intent close_batch -> D
  const mix3 = selectGate({
    intent: "close_batch",
    scopeFiles: ["features/order/order.feature"],
    snapshot: {
      stagedFiles: ["components/ui/button.tsx"],
    },
  });
  assert.strictEqual(mix3.gate.id, "D");
});

test("selectGate: US contradictoria -> needs_input", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["domain/proposal/proposal.ts"],
      isContradictoryUsId: true,
      proposedUsId: "54",
      primaryRecentUsId: "30.1",
    },
  });

  assert.strictEqual(result.status, "needs_input");
  assert.ok(result.diagnostics.some((d) => d.code === "CONTRADICTORY_US_ID"));
});

test("selectGate: cambios unstaged en el mismo archivo staged -> blocked", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["domain/proposal/proposal.ts"],
      unstagedConflicts: ["domain/proposal/proposal.ts"],
    },
  });

  assert.strictEqual(result.status, "blocked");
  assert.ok(result.diagnostics.some((d) => d.code === "UNSTAGED_CONFLICT"));
});

test("selectGate: cambios unstaged no relacionados bloquean evidencia fuera del snapshot", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["domain/proposal/proposal.ts"],
      unstagedConflicts: [],
      unrelatedUnstaged: ["docs/notes.md"],
    },
  });

  assert.strictEqual(result.status, "blocked");
  assert.ok(result.diagnostics.some((d) => d.code === "DIRTY_WORKTREE_OUTSIDE_SNAPSHOT"));
});

test("selectGate: cambios unstaged del control plane bloquean evidencia ambigua", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["domain/proposal/proposal.ts"],
      unstagedConflicts: [],
      unrelatedUnstaged: ["tools/delivery-mcp/server.mjs"],
    },
  });

  assert.strictEqual(result.status, "blocked");
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "DELIVERY_CONTROL_PLANE_DIRTY"));
});

test("selectGate: código productivo con señales de mantenibilidad -> review_required", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["domain/proposal/proposal.ts"],
    },
    maintainability: {
      status: "review_required",
      signalCount: 2,
      signals: [
        {
          rule: "functionLines",
          file: "domain/proposal/proposal.ts",
          line: 15,
          observed: 75,
          threshold: 60,
          message: "Function exceeds 60 lines",
        },
      ],
    },
  });

  assert.strictEqual(result.status, "review_required");
  assert.ok(result.diagnostics.some((d) => d.code === "MAINTAINABILITY_SIGNALS"));
});

test("selectGate: diff > 2MB o > 500 archivos -> blocked", () => {
  const diffResult = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["domain/proposal/proposal.ts"],
      diffTooLarge: true,
    },
  });
  assert.strictEqual(diffResult.status, "blocked");
  assert.ok(diffResult.diagnostics.some((d) => d.code === "DIFF_TOO_LARGE"));

  const countResult = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: Array.from({ length: 501 }, (_, i) => `file${i}.ts`),
      tooManyFiles: true,
    },
  });
  assert.strictEqual(countResult.status, "blocked");
  assert.ok(countResult.diagnostics.some((d) => d.code === "TOO_MANY_FILES"));
});

test("selectGate: intent repair_ci con repairsSha -> Gate R", () => {
  const result = selectGate({
    intent: "repair_ci",
    repairsSha: "1234567890abcdef",
    snapshot: { stagedFiles: ["lib/routes.ts"] },
  });

  assert.strictEqual(result.gate.id, "R");
  assert.strictEqual(result.status, "ready");
  assert.deepStrictEqual(result.gate.reasonCodes, ["INTENT_REPAIR_CI"]);
  assert.deepStrictEqual(result.gate.checkIds, [
    "delivery_unit",
    "lint",
    "typecheck_app",
    "typecheck_cucumber",
    "unit",
    "e2e_full",
    "build",
  ]);
  assert.deepStrictEqual(result.gate.postPushChecks, ["ci_green"]);
});

test("selectGate: intent repair_ci sin repairsSha -> Gate R y diagnostic MISSING_REPAIRS_SHA", () => {
  const result = selectGate({
    intent: "repair_ci",
    snapshot: { stagedFiles: ["lib/routes.ts"] },
  });

  assert.strictEqual(result.gate.id, "R");
  assert.strictEqual(result.status, "needs_input");
  assert.ok(result.diagnostics.some((d) => d.code === "MISSING_REPAIRS_SHA"));
});

test("selectGate: modificar features/support/hooks.ts selecciona Gate C", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["features/support/hooks.ts"],
    },
  });

  assert.strictEqual(result.gate.id, "C");
  assert.strictEqual(result.status, "ready");
  assert.ok(result.gate.reasonCodes.includes("GLOBAL_CUCUMBER_SUPPORT_CHANGED"));
  assert.strictEqual(result.impact.gate, "C");
  assert.deepStrictEqual(result.impact.reasonCodes, ["GLOBAL_CUCUMBER_SUPPORT_CHANGED"]);
  assert.strictEqual(result.impact.confidence, "high");
  assert.ok(result.impact.consumerCount > 0);
  assert.ok(result.impact.affectedFeatures > 0);
  assert.ok(result.gate.checks.includes("make test-e2e-managed"));
});

test("selectGate: step definition compartido por varias features selecciona Gate C", () => {
  // connect_mercado_pago_account_steps.ts is used by multiple features
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["features/auth-onboarding/connect_mercado_pago_account_steps.ts"],
    },
  });

  assert.strictEqual(result.gate.id, "C");
  assert.strictEqual(result.status, "ready");
  assert.ok(result.gate.reasonCodes.includes("SHARED_STEP_CONSUMERS"));
  assert.strictEqual(result.impact.gate, "C");
  assert.deepStrictEqual(result.impact.reasonCodes, ["SHARED_STEP_CONSUMERS"]);
  assert.strictEqual(result.impact.confidence, "high");
  assert.ok(result.impact.affectedFeatures >= 2);
  assert.ok(result.impact.consumerCount >= 2);
});

test("selectGate: step definition utilizado por una única feature selecciona Gate B", () => {
  // register_consumer_with_profile_photo_steps.ts is used ONLY by register_consumer_with_profile_photo.feature
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: [
        "features/auth-onboarding/register_consumer_with_profile_photo_steps.ts",
      ],
    },
  });

  assert.strictEqual(result.gate.id, "B");
  assert.strictEqual(result.status, "ready");
  assert.ok(result.gate.reasonCodes.includes("SINGLE_FEATURE_STEP_CONSUMER"));
  assert.strictEqual(result.impact.gate, "B");
  assert.deepStrictEqual(result.impact.reasonCodes, ["SINGLE_FEATURE_STEP_CONSUMER"]);
  assert.strictEqual(result.impact.affectedFeatures, 1);
  assert.strictEqual(
    result.gate.parameters.featureFile,
    "features/auth-onboarding/register_consumer_with_profile_photo.feature"
  );
  assert.deepStrictEqual(result.gate.checks, [
    "make test-e2e-managed E2E_FILE=features/auth-onboarding/register_consumer_with_profile_photo.feature",
  ]);
});

test("selectGate: step definition nuevo no utilizado selecciona Gate 0", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["features/unused/new_unused_step_file_steps.ts"],
    },
  });

  assert.strictEqual(result.gate.id, "0");
  assert.strictEqual(result.status, "ready");
  assert.strictEqual(result.impact.gate, "0");
  assert.ok(result.impact.reasonCodes.includes("NEW_STEP_NO_CONSUMERS"));
  assert.strictEqual(result.impact.affectedFeatures, 0);
  assert.strictEqual(result.impact.consumerCount, 0);
  assert.strictEqual(result.impact.confidence, "high");
  assert.deepStrictEqual(result.gate.checks, ["make test-e2e-steps-compatible"]);
});

test("selectGate: step definition ambiguo o no resoluble selecciona Gate C conservador", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["features/demo/ambiguous_steps.ts"],
    },
    cucumberImpact: {
      gate: "C",
      reasonCodes: ["AMBIGUOUS_STEP_IMPACT"],
      consumerCount: 1,
      affectedFeatures: 1,
      confidence: "low",
    },
  });

  assert.strictEqual(result.gate.id, "C");
  assert.strictEqual(result.status, "ready");
  assert.strictEqual(result.impact.gate, "C");
  assert.deepStrictEqual(result.impact.reasonCodes, ["AMBIGUOUS_STEP_IMPACT"]);
  assert.strictEqual(result.impact.confidence, "low");
});

test("selectGate: elevación a Gate C por múltiples flujos consumidores de TypeScript", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["components/onboarding/wizard.tsx"],
    },
    typeScriptImpact: {
      gate: "C",
      reasonCodes: ["MULTIPLE_FLOW_CONSUMERS"],
      consumerCount: 4,
      affectedFeatures: 2,
      confidence: "high",
    },
  });

  assert.strictEqual(result.gate.id, "C");
  assert.strictEqual(result.status, "ready");
  assert.ok(result.gate.reasonCodes.includes("MULTIPLE_FLOW_CONSUMERS"));
  assert.strictEqual(result.impact.gate, "C");
  assert.deepStrictEqual(result.impact.reasonCodes, ["MULTIPLE_FLOW_CONSUMERS"]);
  assert.strictEqual(result.impact.confidence, "high");
  assert.strictEqual(result.impact.consumerCount, 4);
  assert.strictEqual(result.impact.affectedFeatures, 2);
  assert.ok(result.gate.checks.includes("make test-e2e-managed"));
});

test("selectGate: elevación a Gate C por layout o provider global de TypeScript", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["components/navigation/global-nav.tsx"],
    },
    dependencyImpact: {
      gate: "C",
      reasonCodes: ["GLOBAL_LAYOUT_OR_PROVIDER"],
      consumerCount: 1,
      affectedFeatures: 1,
      confidence: "high",
    },
  });

  assert.strictEqual(result.gate.id, "C");
  assert.strictEqual(result.status, "ready");
  assert.ok(result.gate.reasonCodes.includes("GLOBAL_LAYOUT_OR_PROVIDER"));
  assert.strictEqual(result.impact.gate, "C");
  assert.deepStrictEqual(result.impact.reasonCodes, ["GLOBAL_LAYOUT_OR_PROVIDER"]);
  assert.strictEqual(result.impact.confidence, "high");
});

test("selectGate: elevación a Gate C por dependencias ambiguas o no resolubles (confidence: low)", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["components/dynamic/widget.tsx"],
    },
    typeScriptImpact: {
      gate: "C",
      reasonCodes: ["AMBIGUOUS_DEPENDENCY_IMPACT"],
      consumerCount: 1,
      affectedFeatures: 1,
      confidence: "low",
    },
  });

  assert.strictEqual(result.gate.id, "C");
  assert.strictEqual(result.status, "ready");
  assert.ok(result.gate.reasonCodes.includes("AMBIGUOUS_DEPENDENCY_IMPACT"));
  assert.strictEqual(result.impact.gate, "C");
  assert.strictEqual(result.impact.confidence, "low");
});

test("selectGate: componente en carpeta desconocida clasificado por dependencias reales sin agregar a la política", () => {
  // Single flow consumer -> Gate A
  const singleResult = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["widgets/single-toast.tsx"],
    },
    typeScriptImpact: {
      gate: "A",
      reasonCodes: ["SINGLE_FLOW_CONSUMER"],
      consumerCount: 1,
      affectedFeatures: 1,
      confidence: "high",
    },
  });

  assert.strictEqual(singleResult.gate.id, "A");
  assert.strictEqual(singleResult.status, "ready");
  assert.ok(singleResult.gate.reasonCodes.includes("SINGLE_FLOW_CONSUMER"));
  assert.strictEqual(singleResult.impact.gate, "A");

  // Multiple flow consumers -> Gate C
  const multiResult = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["widgets/shared-toast.tsx"],
    },
    typeScriptImpact: {
      gate: "C",
      reasonCodes: ["MULTIPLE_FLOW_CONSUMERS"],
      consumerCount: 3,
      affectedFeatures: 2,
      confidence: "high",
    },
  });

  assert.strictEqual(multiResult.gate.id, "C");
  assert.strictEqual(multiResult.status, "ready");
  assert.ok(multiResult.gate.reasonCodes.includes("MULTIPLE_FLOW_CONSUMERS"));
  assert.strictEqual(multiResult.impact.gate, "C");
});

test("selectGate: combina cucumberImpact y typeScriptImpact prevaleciendo el gate de mayor prioridad", () => {
  // TS Impact is C, Cucumber Impact is B -> Gate C wins
  const mixTsWins = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["components/shared/card.tsx", "features/auth/login_steps.ts"],
    },
    typeScriptImpact: {
      gate: "C",
      reasonCodes: ["MULTIPLE_FLOW_CONSUMERS"],
      consumerCount: 3,
      affectedFeatures: 2,
      confidence: "high",
    },
    cucumberImpact: {
      gate: "B",
      reasonCodes: ["SINGLE_FEATURE_STEP_CONSUMER"],
      consumerCount: 1,
      affectedFeatures: 1,
      confidence: "high",
      parameters: { featureFile: "features/auth/login.feature" },
    },
  });

  assert.strictEqual(mixTsWins.gate.id, "C");
  assert.strictEqual(mixTsWins.impact.gate, "C");
  assert.deepStrictEqual(mixTsWins.impact.reasonCodes, ["MULTIPLE_FLOW_CONSUMERS"]);

  // Cucumber Impact is C, TS Impact is A -> Gate C wins
  const mixCucumberWins = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["domain/user/user.ts", "features/support/hooks.ts"],
    },
    typeScriptImpact: {
      gate: "A",
      reasonCodes: ["ISOLATED_PRODUCTION_CODE"],
      consumerCount: 1,
      affectedFeatures: 0,
      confidence: "high",
    },
    cucumberImpact: {
      gate: "C",
      reasonCodes: ["GLOBAL_CUCUMBER_SUPPORT_CHANGED"],
      consumerCount: 10,
      affectedFeatures: 5,
      confidence: "high",
    },
  });

  assert.strictEqual(mixCucumberWins.gate.id, "C");
  assert.strictEqual(mixCucumberWins.impact.gate, "C");
  assert.deepStrictEqual(mixCucumberWins.impact.reasonCodes, ["GLOBAL_CUCUMBER_SUPPORT_CHANGED"]);
});

test("selectGate: eliminación de step consumido por una feature eleva a Gate B (DELETED_STEP_SINGLE_FEATURE_CONSUMER)", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["features/orders/checkout_steps.ts"],
    },
    cucumberImpact: {
      gate: "B",
      reasonCodes: ["DELETED_STEP_SINGLE_FEATURE_CONSUMER"],
      consumerCount: 1,
      affectedFeatures: 1,
      confidence: "high",
      parameters: { featureFile: "features/orders/checkout.feature" },
    },
  });

  assert.strictEqual(result.gate.id, "B");
  assert.ok(result.gate.reasonCodes.includes("DELETED_STEP_SINGLE_FEATURE_CONSUMER"));
  assert.strictEqual(result.gate.parameters?.featureFile, "features/orders/checkout.feature");
  assert.deepStrictEqual(result.gate.checks, [
    "make test-e2e-managed E2E_FILE=features/orders/checkout.feature",
  ]);
});

test("selectGate: eliminación de step consumido por múltiples features eleva a Gate C (DELETED_SHARED_STEP_CONSUMERS)", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["features/auth/auth_steps.ts"],
    },
    cucumberImpact: {
      gate: "C",
      reasonCodes: ["DELETED_SHARED_STEP_CONSUMERS"],
      consumerCount: 4,
      affectedFeatures: 2,
      confidence: "high",
    },
  });

  assert.strictEqual(result.gate.id, "C");
  assert.ok(result.gate.reasonCodes.includes("DELETED_SHARED_STEP_CONSUMERS"));
  assert.ok(result.gate.checks.includes("make test-e2e-managed"));
});

test("selectGate: eliminación de dependencia compartida de TypeScript eleva a Gate C (DELETED_SHARED_DEPENDENCY)", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["components/shared/badge.tsx"],
    },
    typeScriptImpact: {
      gate: "C",
      reasonCodes: ["DELETED_SHARED_DEPENDENCY"],
      consumerCount: 2,
      affectedFeatures: 2,
      confidence: "high",
    },
  });

  assert.strictEqual(result.gate.id, "C");
  assert.ok(result.gate.reasonCodes.includes("DELETED_SHARED_DEPENDENCY"));
});

test("selectGate: ambigüedad o incertidumbre (confidence: low) prioriza Gate C", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["domain/calc.ts"],
    },
    typeScriptImpact: {
      gate: "C",
      reasonCodes: ["AMBIGUOUS_DEPENDENCY_IMPACT"],
      consumerCount: 0,
      affectedFeatures: 0,
      confidence: "low",
    },
    cucumberImpact: {
      gate: "0",
      reasonCodes: ["NEW_STEP_NO_CONSUMERS"],
      consumerCount: 0,
      affectedFeatures: 0,
      confidence: "high",
    },
  });

  assert.strictEqual(result.gate.id, "C");
  assert.strictEqual(result.impact.gate, "C");
  assert.strictEqual(result.impact.confidence, "low");
  assert.ok(result.impact.reasonCodes.includes("AMBIGUOUS_DEPENDENCY_IMPACT"));
});

test("selectGate: factorear stepConsumers que afectan varias features eleva a Gate C (SHARED_STEP_DEPENDENCY_CONSUMERS)", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["domain/calc.ts"],
    },
    typeScriptImpact: {
      gate: "C",
      reasonCodes: ["SHARED_STEP_DEPENDENCY_CONSUMERS"],
      consumerCount: 2,
      affectedFeatures: 2,
      confidence: "high",
    },
  });

  assert.strictEqual(result.gate.id, "C");
  assert.ok(result.gate.reasonCodes.includes("SHARED_STEP_DEPENDENCY_CONSUMERS"));
});

test("selectGate: modificar Dockerfile bloquea con HUMAN_ONLY_CHANGE", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: { stagedFiles: ["Dockerfile"] },
  });

  assert.strictEqual(result.status, "blocked");
  assert.ok(result.diagnostics.some((d) => d.code === "HUMAN_ONLY_CHANGE"));
});

test("selectGate: modificar .dockerignore o compose*.yml bloquea con HUMAN_ONLY_CHANGE", () => {
  const dockerignoreResult = selectGate({
    intent: "prepare_commit",
    snapshot: { stagedFiles: [".dockerignore"] },
  });
  assert.strictEqual(dockerignoreResult.status, "blocked");
  assert.ok(dockerignoreResult.diagnostics.some((d) => d.code === "HUMAN_ONLY_CHANGE"));

  const composeResult = selectGate({
    intent: "prepare_commit",
    snapshot: { stagedFiles: ["compose.dev.yml"] },
  });
  assert.strictEqual(composeResult.status, "blocked");
  assert.ok(composeResult.diagnostics.some((d) => d.code === "HUMAN_ONLY_CHANGE"));

  const workflowResult = selectGate({
    intent: "prepare_commit",
    snapshot: { stagedFiles: [".github/workflows/docker-publish.yml"] },
  });
  assert.strictEqual(workflowResult.status, "blocked");
  assert.ok(workflowResult.diagnostics.some((d) => d.code === "HUMAN_ONLY_CHANGE"));
});

