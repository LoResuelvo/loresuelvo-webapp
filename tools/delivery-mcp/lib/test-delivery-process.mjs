import { spawn } from "node:child_process";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { assertSafeRepoPath } from "./repo-root.mjs";
import { assertRealPathInsideRepo } from "./test-delivery-scope.mjs";
import { redactSecrets } from "./redact-secrets.mjs";
import { parseDiagnostics } from "./parse-diagnostics.mjs";

export const DEFAULT_TEST_TIMEOUT_MS = 180000;

export async function executeProcessDefault({
  command,
  args,
  cwd,
  env = process.env,
  timeoutMs = DEFAULT_TEST_TIMEOUT_MS,
  logPath,
  limits = {},
}) {
  assertSafeRepoPath(cwd, logPath, "Log path");
  const absoluteLogPath = path.resolve(cwd, logPath);
  await fsPromises.mkdir(path.dirname(absoluteLogPath), { recursive: true });
  assertRealPathInsideRepo(cwd, path.dirname(absoluteLogPath), "Log directory");
  if (fs.existsSync(absoluteLogPath)) {
    assertRealPathInsideRepo(cwd, absoluteLogPath, "Log path");
  }

  const capturedChunks = [];
  let capturedBytes = 0;
  let outputTail = Buffer.alloc(0);
  let outputTruncated = false;
  const startedAt = Date.now();
  const maxLogBytes = limits.maxCheckLogBytes ?? 5242880;
  const maxSummaryLines = limits.maxFailureSummaryLines ?? 6;

  const child = spawn(command, args, {
    cwd,
    env,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32" && !process.env.DELIVERY_JOB_ID,
  });

  function capture(chunk) {
    const buffer = Buffer.from(chunk);
    outputTail = Buffer.concat([outputTail, buffer]).subarray(-20000);
    const remaining = maxLogBytes - capturedBytes;
    if (remaining > 0) {
      const captured = buffer.subarray(0, remaining);
      capturedChunks.push(captured);
      capturedBytes += captured.length;
    }
    if (buffer.length > remaining) outputTruncated = true;
  }

  child.stdout?.on("data", capture);
  child.stderr?.on("data", capture);

  let timedOut = false;
  let forceKillTimeout;
  function signalProcessTree(signal) {
    const pid = child.pid;
    if (!pid) return;

    if (process.platform !== "win32") {
      try {
        process.kill(-pid, signal);
      } catch {
        try {
          process.kill(pid, signal);
        } catch {
          // Exited
        }
      }
    } else {
      try {
        process.kill(pid, signal);
      } catch {
        // Exited
      }
    }
  }

  const timeout = setTimeout(() => {
    timedOut = true;
    signalProcessTree("SIGTERM");
    forceKillTimeout = setTimeout(() => signalProcessTree("SIGKILL"), 1500);
  }, timeoutMs);

  const outcome = await new Promise((resolve) => {
    let settled = false;
    const finish = (val) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };
    child.on("error", (error) => finish({ exitCode: null, error }));
    child.on("close", (exitCode, signal) => finish({ exitCode, signal, error: null }));
  });

  clearTimeout(timeout);
  if (timedOut) signalProcessTree("SIGKILL");
  if (forceKillTimeout) clearTimeout(forceKillTimeout);

  const capturedOutput = Buffer.concat(capturedChunks).toString("utf8");
  const rawOutputTail = outputTail.toString("utf8");
  const safeCapturedOutput = redactSecrets(capturedOutput);
  const safeOutputTail = redactSecrets(rawOutputTail);
  const safeLog = outputTruncated
    ? `${safeCapturedOutput}\n[delivery test runner truncated this log]\n[delivery test runner output tail]\n${safeOutputTail}`
    : safeCapturedOutput;
  await fsPromises.writeFile(absoluteLogPath, safeLog, { flag: "w", mode: 0o600 });

  const durationMs = Date.now() - startedAt;
  const passed = !timedOut && !outcome.error && outcome.exitCode === 0 && !outcome.signal;
  const parsedDiag = parseDiagnostics({
    command,
    args,
    output: safeCapturedOutput,
    outputTail: safeOutputTail,
    outputTruncated,
    exitCode: outcome.exitCode,
    signal: outcome.signal,
    timedOut,
    error: outcome.error,
    maxSummaryLines,
    maxLocations: maxSummaryLines,
  });

  const summaryLines = passed ? [] : parsedDiag.summaryLines;
  const locations = passed ? [] : parsedDiag.locations;

  return {
    passed,
    timedOut,
    exitCode: outcome.exitCode,
    error: outcome.error,
    durationMs,
    rawOutput: outputTruncated ? `${safeCapturedOutput}\n${safeOutputTail}` : safeCapturedOutput,
    outputTail: safeOutputTail,
    outputTruncated,
    summaryLines,
    locations,
    counts: parsedDiag.counts,
    code: parsedDiag.code,
    message: parsedDiag.message,
    logPath,
  };
}
