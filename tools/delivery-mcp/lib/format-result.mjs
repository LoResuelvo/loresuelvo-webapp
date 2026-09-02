export function formatInspectionResult({
  snapshot,
  gateResult,
  maintainability,
} = {}) {
  const diagnostics = [...(gateResult?.diagnostics || [])];

  if (maintainability?.operationalDiagnostic) {
    diagnostics.push(maintainability.operationalDiagnostic);
  }

  // Sanitize diagnostics: ensure no stack traces or raw errors leak
  const sanitizedDiagnostics = diagnostics.slice(0, 20).map((d) => {
    const item = {
      code: String(d.code || "DELIVERY_UNKNOWN"),
      message: String(d.message || "An unspecified inspection error occurred").split("\n")[0],
      retryable: Boolean(d.retryable),
    };
    if (d.file) item.file = String(d.file);
    if (typeof d.line === "number") item.line = d.line;
    return item;
  });

  const sanitizedSignals = (maintainability?.signals || []).slice(0, 20).map((s) => ({
    rule: String(s.rule || "unknown"),
    file: String(s.file || "unknown"),
    line: typeof s.line === "number" ? s.line : 1,
    observed: s.observed ?? 0,
    threshold: s.threshold ?? 0,
    message: String(s.message || "").split("\n")[0],
  }));

  return {
    schemaVersion: 1,
    status: gateResult?.status || "ready",
    snapshotHash: snapshot?.snapshotHash || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    repository: {
      branch: snapshot?.branch || "HEAD",
      headSha: snapshot?.headSha || "UNKNOWN",
      usId: snapshot?.usId || null,
    },
    gate: {
      id: gateResult?.gate?.id || "NONE",
      reasonCodes: gateResult?.gate?.reasonCodes || [],
      checks: gateResult?.gate?.checks || [],
    },
    maintainability: {
      status: maintainability?.status || "not_applicable",
      filesReviewed: maintainability?.filesReviewed || [],
      signalCount: maintainability?.signalCount ?? sanitizedSignals.length,
      signals: sanitizedSignals,
    },
    diagnostics: sanitizedDiagnostics,
  };
}
