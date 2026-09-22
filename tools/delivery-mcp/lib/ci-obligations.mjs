const STATUS_PRIORITY = {
  provider_error: 0,
  failed: 1,
  timed_out: 1,
  cancelled: 1,
  not_found: 2,
  in_progress: 3,
  queued: 4,
  passed: 5,
};

export function normalizeCiStatus(status, conclusion) {
  if (["queued", "waiting", "pending", "requested"].includes(status)) return "queued";
  if (status !== "completed") return "in_progress";
  if (conclusion === "success") return "passed";
  if (conclusion === "cancelled") return "cancelled";
  if (conclusion === "timed_out") return "timed_out";
  return "failed";
}

function runIdentity(run) {
  return {
    id: Number(run.databaseId ?? run.id) || 0,
    attempt: Number(run.runAttempt ?? run.run_attempt) || 1,
    updatedAt: Date.parse(run.updatedAt ?? run.updated_at ?? "") || 0,
  };
}

function newer(left, right) {
  const a = runIdentity(left);
  const b = runIdentity(right);
  return a.id - b.id || a.attempt - b.attempt || a.updatedAt - b.updatedAt;
}

export function selectRequiredRuns(runs, requirements, sha) {
  return requirements.map((requirement) => {
    const matching = runs.filter((run) =>
      run.name === requirement.name && run.event === requirement.event &&
      (run.headSha ?? run.head_sha)?.toLowerCase() === sha.toLowerCase());
    return { requirement, run: matching.length ? matching.reduce((latest, candidate) =>
      newer(candidate, latest) > 0 ? candidate : latest) : null };
  });
}

function latestJob(jobs, name) {
  const matching = jobs.filter((job) => job.name === name);
  return matching.length ? matching.reduce((latest, candidate) =>
    newer(candidate, latest) > 0 ? candidate : latest) : null;
}

export function aggregateRequiredCi(sha, resolved) {
  const checks = [];
  const workflows = resolved.map(({ requirement, run, jobs = [] }) => {
    const runStatus = run ? normalizeCiStatus(run.status, run.conclusion) : "not_found";
    const runId = run ? Number(run.databaseId ?? run.id) : null;
    const jobStatuses = requirement.jobs.map((name) => {
      const job = latestJob(jobs, name);
      const status = job ? normalizeCiStatus(job.status, job.conclusion)
        : ["queued", "in_progress"].includes(runStatus) ? runStatus : "not_found";
      checks.push({ workflow: requirement.name, name, status, runId });
      return status;
    });
    const status = [runStatus, ...jobStatuses].sort((a, b) =>
      STATUS_PRIORITY[a] - STATUS_PRIORITY[b])[0];
    return { requirement, run, runId, status };
  });

  const dominant = [...workflows].sort((a, b) =>
    STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status])[0];
  const status = dominant.status;
  const failedJobs = checks.filter((check) =>
    ["failed", "timed_out", "cancelled"].includes(check.status)).map((check) => check.name);
  const message = status === "not_found"
    ? `Required CI workflow or job is missing for commit ${sha.slice(0, 8)}`
    : `Required CI workflow '${dominant.requirement.name}' is '${status}' for commit ${sha.slice(0, 8)}`;

  return {
    schemaVersion: 1,
    sha,
    workflow: dominant.runId ? { id: dominant.runId, name: dominant.requirement.name } : null,
    status,
    requiredChecks: checks,
    failedJobs,
    failure: ["failed", "cancelled", "timed_out", "not_found"].includes(status)
      ? { message, excerpt: message } : null,
    url: dominant.run?.html_url ?? dominant.run?.url ?? null,
    retryable: ["failed", "cancelled", "timed_out", "provider_error"].includes(status),
  };
}
