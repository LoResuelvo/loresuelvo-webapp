import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const CUCUMBER_IMPACT_SCHEMA_VERSION = 1;
export const CUCUMBER_IMPACT_INDEX_PATH = ".delivery/runtime/indexes/cucumber-impact-v2.json";
export const CUCUMBER_HEAD_INDEX_PATH =
  ".delivery/runtime/indexes/cucumber-impact-head-v2.json";

export function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function readGitValue(repoRoot, args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

export function getGitHeadIdentity(repoRoot) {
  return {
    branch: readGitValue(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"]),
    headSha: readGitValue(repoRoot, ["rev-parse", "HEAD"]),
    headTree: readGitValue(repoRoot, ["rev-parse", "HEAD^{tree}"]),
  };
}

export function computeIndexFingerprint(fileHashes) {
  const entries = Object.entries(fileHashes).sort(([left], [right]) =>
    left.localeCompare(right)
  );
  return sha256(JSON.stringify(entries));
}

export function writeIndexAtomically(targetPath, index) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const temporaryPath = `${targetPath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, JSON.stringify(index, null, 2), "utf8");
    fs.renameSync(temporaryPath, targetPath);
  } finally {
    fs.rmSync(temporaryPath, { force: true });
  }
}

export function listGitHeadFiles(repoRoot) {
  const output = execFileSync("git", ["ls-tree", "-r", "--name-only", "-z", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: 16 * 1024 * 1024,
  });
  return output.split("\0").filter(Boolean).sort();
}

export function readGitHeadFile(repoRoot, relativePath) {
  try {
    return execFileSync("git", ["show", `HEAD:${relativePath}`], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}
