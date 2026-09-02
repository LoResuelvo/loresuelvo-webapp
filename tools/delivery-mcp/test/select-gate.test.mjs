import test from "node:test";
import assert from "node:assert/strict";
import { selectGate } from "../lib/select-gate.mjs";

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
  assert.ok(result.gate.checks.includes("npx tsc --noEmit"));
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
    snapshot: {
      stagedFiles: ["domain/order/order.ts"],
    },
  });
  assert.strictEqual(batchResult.gate.id, "D");
  assert.strictEqual(batchResult.status, "ready");
  assert.ok(batchResult.gate.checks.includes("verify no @wip tags remaining in scope"));

  const usResult = selectGate({
    intent: "close_us",
    snapshot: {
      stagedFiles: ["domain/order/order.ts"],
    },
  });
  assert.strictEqual(usResult.gate.id, "D");
  assert.strictEqual(usResult.status, "ready");
});

test("selectGate: documentación o configuración solamente -> Gate NONE", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: [
        "AGENTS.md",
        "docs/architecture.md",
        ".delivery/policy.v1.json",
      ],
    },
  });

  assert.strictEqual(result.gate.id, "NONE");
  assert.strictEqual(result.status, "ready");
  assert.deepStrictEqual(result.gate.checks, []);
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
  assert.ok(mix2.gate.checks.includes("npx tsc --project tsconfig.cucumber.json --noEmit"));

  // Mixed Gate C + intent close_batch -> D
  const mix3 = selectGate({
    intent: "close_batch",
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

test("selectGate: cambios unstaged no relacionados -> warning, no bloqueado", () => {
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: ["domain/proposal/proposal.ts"],
      unstagedConflicts: [],
      unrelatedUnstaged: ["docs/notes.md"],
    },
  });

  assert.strictEqual(result.status, "ready");
  assert.ok(result.diagnostics.some((d) => d.code === "UNSTAGED_CHANGES"));
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
