#!/usr/bin/env node
import { findRepoRoot } from "./repo-root.mjs";
import {
  getDeliveryJob,
  transitionDeliveryJob,
  readProcessIdentity,
  validateJobSubject,
} from "./jobs.mjs";
import { prepareDelivery } from "./prepare-delivery.mjs";
import { finalizeDelivery, verifyHeadDelivery } from "./delivery-finalize.mjs";
import { redactSecrets } from "./redact-secrets.mjs";
import { computeRepositoryInputFingerprint, testDelivery } from "./test-delivery.mjs";

async function run() {
  const jobId = process.argv[2];
  const repoRootArg = process.argv[3];
  if (!jobId) {
    console.error("Missing jobId argument");
    process.exit(1);
  }

  const root = findRepoRoot(repoRootArg);
  const job = await getDeliveryJob({ repoRoot: root, jobId });
  if (!job) {
    console.error(`Job not found: ${jobId}`);
    process.exit(1);
  }

  if (["passed", "failed", "timed_out", "cancelled"].includes(job.status)) {
    process.exit(0);
  }

  const ownerGeneration = process.env.DELIVERY_JOB_OWNER_GENERATION;
  if (!ownerGeneration || ownerGeneration !== job.ownerGeneration ||
      process.env.DELIVERY_JOB_TOKEN !== job.workerToken) {
    console.error("JOB_OWNER_MISMATCH");
    process.exit(1);
  }
  const persist = (updates, from = ["queued", "running", "cancelling"]) =>
    transitionDeliveryJob({ repoRoot: root, jobId, ownerGeneration, from, updates });

  let subjectValidation;
  try {
    subjectValidation = await validateJobSubject({
      repoRoot: root,
      subject: job.subject,
      computeWorkingTreeFingerprint: computeRepositoryInputFingerprint,
    });
  } catch (error) {
    subjectValidation = {
      valid: false,
      code: error.code || "JOB_SUBJECT_READ_FAILED",
      message: redactSecrets(String(error.message || "Unable to validate delivery job subject"))
        .split("\n")[0]
        .slice(0, 240),
      expected: job.subject || null,
      actual: null,
    };
  }
  if (!subjectValidation.valid) {
    await persist({
      status: "failed",
      finishedAt: new Date().toISOString(),
      error: {
        code: subjectValidation.code,
        message: subjectValidation.message,
        expected: subjectValidation.expected,
        actual: subjectValidation.actual,
      },
    });
    return;
  }

  const workerToken = process.env.DELIVERY_JOB_TOKEN || job.workerToken || null;
  const workerIdentity = await readProcessIdentity(process.pid);
  await persist({
    status: "running",
    pid: process.pid,
    startedAt: job.startedAt || new Date().toISOString(),
    ...(workerToken ? { workerToken } : {}),
    ...(workerIdentity ? { workerIdentity } : {}),
  }, ["queued", "running"]);

  // Only the supervisor may persist cancelled, after the entire group exits.
  process.on("SIGTERM", () => process.exit(143));
  process.on("SIGINT", () => process.exit(130));

  try {
    if (job.type === "finalize") {
      const result = await finalizeDelivery({
        ...job.params,
        repoRoot: root,
        mode: "sync",
      });
      const timedOut = result.reason === "CI_TIMEOUT" || result.status === "timed_out";
      const jobStatus = result.finalized ? "passed" : timedOut ? "timed_out" : "failed";
      const storedResult = timedOut ? { ...result, status: "timed_out" } : result;
      await persist({
        status: jobStatus,
        finishedAt: new Date().toISOString(),
        result: storedResult,
      });
    } else if (job.type === "verify_head") {
      const result = await verifyHeadDelivery({
        ...job.params,
        repoRoot: root,
        mode: "sync",
        workerJobId: jobId,
      });
      await persist({
        status: result.verified ? "passed" : "failed",
        finishedAt: new Date().toISOString(),
        result,
      });
    } else if (job.type === "test") {
      const result = await testDelivery({
        ...job.params,
        repoRoot: root,
        // The worker already owns this record. This marker bypasses job
        // deduplication and keeps a recovered worker from enqueueing itself.
        executionMode: "sync",
        async: false,
        workerJobId: jobId,
      });
      const timedOut =
        result.status === "failed" &&
        (result.failure?.code === "CHECK_TIMEOUT" ||
          result.diagnostics?.some?.((diagnostic) => diagnostic.code === "CHECK_TIMEOUT"));
      const jobStatus = timedOut ? "timed_out" : result.status === "passed" ? "passed" : "failed";
      const storedResult = timedOut ? { ...result, status: "timed_out" } : result;
      await persist({
        status: jobStatus,
        finishedAt: new Date().toISOString(),
        result: storedResult,
      });
    } else {
      const outcome = await prepareDelivery({
        ...job.params,
        repoRoot: root,
        mode: "sync",
        workerJobId: jobId,
      });
      await persist({
        status: outcome.status === "passed" ? "passed" : "failed",
        finishedAt: new Date().toISOString(),
        result: outcome,
      });
    }
  } catch (error) {
    if (["JOB_TRANSITION_REJECTED", "OWNER_GENERATION_MISMATCH"].includes(error.code)) return;
    const message = redactSecrets(String(error.message || "Unknown worker error")).split("\n")[0];
    await persist({
      status: "failed",
      finishedAt: new Date().toISOString(),
      error: { code: error.code || "WORKER_ERROR", message },
    });
  }
}

run().catch((err) => {
  console.error("Fatal job runner error:", err);
  process.exit(1);
});
