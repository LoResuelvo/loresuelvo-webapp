import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

// flock owns the descriptor, not a removable marker. If the caller crashes,
// the pipe closes and the OS releases the lock. Lock files are never unlinked.
export async function withJobMutex(repoRoot, key, callback) {
  const digest = crypto.createHash("sha256").update(key).digest("hex");
  const directory = path.resolve(repoRoot, ".delivery/runtime/job-mutexes");
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const child = spawn("flock", ["-x", "-w", "10", path.join(directory, `${digest}.lock`),
    "sh", "-c", "printf 'READY\\n'; read ignored"], {
    cwd: repoRoot,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let output = "";
  try {
    await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code) => reject(new Error(`Job mutex unavailable (${code})`)));
      child.stdout.on("data", (chunk) => {
        output += chunk.toString();
        if (output.includes("READY\n")) resolve();
      });
    });
    return await callback();
  } finally {
    child.stdin.end("\n");
    await new Promise((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once("exit", resolve);
    });
  }
}
