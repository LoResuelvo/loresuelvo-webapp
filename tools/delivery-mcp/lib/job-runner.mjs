#!/usr/bin/env node
import { findRepoRoot } from "./repo-root.mjs";
import { getDeliveryJob, updateDeliveryJob } from "./jobs.mjs";
import { prepareDelivery } from "./prepare-delivery.mjs";
import { finalizeDelivery } from "./delivery-finalize.mjs";
import { redactSecrets } from "./redact-secrets.mjs";

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

  await updateDeliveryJob({
    repoRoot: root,
    jobId,
    updates: {
      status: "running",
      pid: process.pid,
      startedAt: job.startedAt || new Date().toISOString(),
    },
  });

  const onSignal = async (sig) => {
    try {
      await updateDeliveryJob({
        repoRoot: root,
        jobId,
        updates: {
          status: "cancelled",
          finishedAt: new Date().toISOString(),
          error: { code: "CANCELLED", message: `Terminated by signal ${sig}` },
        },
      });
    } catch {
      // ignore
    }
    process.exit(143);
  };
  process.on("SIGTERM", () => onSignal("SIGTERM"));
  process.on("SIGINT", () => onSignal("SIGINT"));

  try {
    if (job.type === "finalize") {
      const result = await finalizeDelivery({
        ...job.params,
        repoRoot: root,
      });
      await updateDeliveryJob({
        repoRoot: root,
        jobId,
        updates: {
          status: result.finalized ? "passed" : "failed",
          finishedAt: new Date().toISOString(),
          result,
        },
      });
    } else {
      const outcome = await prepareDelivery({
        ...job.params,
        repoRoot: root,
        mode: "sync",
      });
      await updateDeliveryJob({
        repoRoot: root,
        jobId,
        updates: {
          status: outcome.status === "passed" ? "passed" : "failed",
          finishedAt: new Date().toISOString(),
          result: outcome,
        },
      });
    }
  } catch (error) {
    const message = redactSecrets(String(error.message || "Unknown worker error")).split("\n")[0];
    await updateDeliveryJob({
      repoRoot: root,
      jobId,
      updates: {
        status: "failed",
        finishedAt: new Date().toISOString(),
        error: { code: error.code || "WORKER_ERROR", message },
      },
    });
  }
}

run().catch((err) => {
  console.error("Fatal job runner error:", err);
  process.exit(1);
});
