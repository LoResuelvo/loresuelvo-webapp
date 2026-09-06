import { inspectDelivery } from "./inspect-delivery.mjs";
import { runGate } from "./run-gate.mjs";
import { findRepoRoot } from "./repo-root.mjs";
import { validateExecutionResult } from "./validate-schema.mjs";
import { recordPreparedEvidence, verifyPreparedEvidence } from "./delivery-ledger.mjs";
import { saveDeliveryContext } from "./delivery-context.mjs";


function stoppedResult(inspection, status, extraDiagnostic, repoRoot) {
  const diagnostics = [
    ...inspection.diagnostics,
    ...(extraDiagnostic ? [extraDiagnostic] : []),
  ];
  const res = {
    schemaVersion: 1,
    status,
    snapshotHash: inspection.snapshotHash,
    runKey: null,
    cached: false,
    policy: inspection.policy,
    gate: {
      id: inspection.gate.id,
      reasonCodes: inspection.gate.reasonCodes,
      checkIds: inspection.gate.checkIds,
      parameters: inspection.gate.parameters,
      postPushChecks: inspection.gate.postPushChecks,
    },
    summary: { passed: 0, failed: 0, skipped: inspection.gate.checkIds.length, durationMs: 0 },
    checks: [],
    diagnostics,
    evidence: { recordPath: null },
  };
  validateExecutionResult(res, repoRoot);
  return res;
}

export function resolveReview(inspection, acknowledgement) {
  if (inspection.status !== "review_required") {
    return { accepted: true, review: { status: "not_required" } };
  }

  // 1. If acknowledgement is missing completely, require review
  if (!acknowledgement) {
    return {
      accepted: false,
      status: "review_required",
      diagnostic: {
        code: "MAINTAINABILITY_ACK_REQUIRED",
        message:
          "Review each maintainability signal, then acknowledge this exact snapshot with per-signal decisions",
        retryable: false,
      },
    };
  }

  // 2. Snapshot hash must match exactly
  if (acknowledgement.snapshotHash !== inspection.snapshotHash) {
    return {
      accepted: false,
      status: "blocked",
      diagnostic: {
        code: "MAINTAINABILITY_HASH_MISMATCH",
        message: `Acknowledgement snapshotHash (${acknowledgement.snapshotHash}) does not match current snapshot (${inspection.snapshotHash})`,
        retryable: false,
      },
    };
  }

  // 3. Must cover every signal with a stable id and justification (>= 12 chars).
  // Criterion 10: "No aceptar bypass genérico de todas las señales."
  const signals = inspection.maintainability?.signals || [];
  if (
    inspection.maintainability?.truncated ||
    (inspection.maintainability?.signalCount || 0) > signals.length
  ) {
    return {
      accepted: false,
      status: "blocked",
      diagnostic: {
        code: "MAINTAINABILITY_SIGNAL_LIMIT_EXCEEDED",
        message:
          "Maintainability signals exceed the policy display limit. Reduce the changed scope or resolve signals before preparing the commit",
        retryable: false,
      },
    };
  }
  const decisionsMap = new Map();

  if (acknowledgement.decisions) {
    if (Array.isArray(acknowledgement.decisions)) {
      for (const item of acknowledgement.decisions) {
        const id = item.id || item.signalId;
        const reason = item.reason || item.justification;
        if (id && reason) decisionsMap.set(String(id).trim(), String(reason).trim());
      }
    } else if (typeof acknowledgement.decisions === "object") {
      for (const [id, reason] of Object.entries(acknowledgement.decisions)) {
        if (id && reason) decisionsMap.set(String(id).trim(), String(reason).trim());
      }
    }
  }

  // If no per-signal decisions provided, generic bypass is rejected
  if (decisionsMap.size === 0 && signals.length > 0) {
    return {
      accepted: false,
      status: "blocked",
      diagnostic: {
        code: "MAINTAINABILITY_DECISIONS_INCOMPLETE",
        message:
          "Generic bypass rejected. Each maintainability signal must have an explicit decision with id and justification of at least 12 characters",
        retryable: false,
      },
    };
  }

  const missingSignals = [];
  const invalidSignals = [];

  for (const signal of signals) {
    const signalId = signal.id || `${signal.rule}:${signal.file}:${signal.line}`;
    const justification = decisionsMap.get(signalId);
    if (!justification) {
      missingSignals.push(signalId);
    } else if (justification.length < 12) {
      invalidSignals.push(signalId);
    }
  }

  if (missingSignals.length > 0 || invalidSignals.length > 0) {
    const missingDesc = missingSignals.length > 0 ? `missing: [${missingSignals.join(", ")}]` : "";
    const invalidDesc = invalidSignals.length > 0 ? `justification < 12 chars: [${invalidSignals.join(", ")}]` : "";
    const details = [missingDesc, invalidDesc].filter(Boolean).join("; ");
    return {
      accepted: false,
      status: "blocked",
      diagnostic: {
        code: "MAINTAINABILITY_DECISIONS_INCOMPLETE",
        message: `Maintainability decisions incomplete (${details})`,
        retryable: false,
      },
    };
  }

  return {
    accepted: true,
    review: {
      status: "acknowledged",
      snapshotHash: acknowledgement.snapshotHash,
      decisions: Object.fromEntries(decisionsMap),
      reason: acknowledgement.reason || "Per-signal maintainability decisions accepted",
    },
  };
}

export async function prepareDelivery({
  repoRoot,
  acknowledgement,
  force = false,
  ...inspectionInput
} = {}) {
  const root = findRepoRoot(repoRoot);
  const context = await inspectDelivery({ repoRoot: root, ...inspectionInput });
  const { result: inspection, snapshot, policy, resolvedInput } = context;

  if (inspection.status === "no_changes") {
    return stoppedResult(inspection, "no_changes", null, root);
  }
  if (inspection.status === "blocked" || inspection.status === "needs_input") {
    return stoppedResult(inspection, inspection.status, null, root);
  }

  if (!force) {
    const prepared = await verifyPreparedEvidence({
      repoRoot: root,
      snapshot,
      inspection,
      intent: resolvedInput.intent,
      repairsSha: resolvedInput.repairsSha,
    });
    if (prepared.valid) return { ...prepared.record, cached: true };
  }

  const review = resolveReview(inspection, acknowledgement);
  if (!review.accepted) {
    return stoppedResult(inspection, review.status || "review_required", review.diagnostic, root);
  }

  const outcome = await runGate({
    inspection,
    snapshot,
    policy,
    repoRoot: root,
    review: review.review,
    force,
  });

  if (outcome.status === "passed" && resolvedInput.intent !== "prepare_commit") {
    await saveDeliveryContext({
      repoRoot: root,
      snapshot,
      intent: resolvedInput.intent,
      usId: resolvedInput.usId,
      featureFile: resolvedInput.featureFile,
      scenarioName: resolvedInput.scenarioName,
      scopeFiles: resolvedInput.scopeFiles,
      repairsSha: resolvedInput.repairsSha,
    });
  }

  await recordPreparedEvidence({
    repoRoot: root,
    snapshot,
    inspection,
    intent: resolvedInput.intent,
    usId: resolvedInput.usId,
    featureFile: resolvedInput.featureFile,
    scenarioName: resolvedInput.scenarioName,
    scopeFiles: resolvedInput.scopeFiles,
    runKey: outcome.runKey,
    status: outcome.status,
    recordPath: outcome.evidence?.recordPath,
    repairsSha: resolvedInput.repairsSha,
  });

  return outcome;
}
