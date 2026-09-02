import { execFile } from "node:child_process";
import crypto from "node:crypto";
import util from "node:util";

const execFileAsync = util.promisify(execFile);

const US_ID_REGEX = /\[([0-9]+(?:\.[0-9]+)*)\]/;
const MAX_STAGED_FILES = 500;
const MAX_DIFF_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export function extractUsId(message) {
  if (!message || typeof message !== "string") return null;
  const match = message.match(US_ID_REGEX);
  return match ? match[1] : null;
}

export async function runGit(args, cwd) {
  try {
    const { stdout, stderr } = await execFileAsync("git", args, {
      cwd,
      maxBuffer: 20 * 1024 * 1024,
      encoding: "buffer",
    });
    return { stdout, stderr, error: null };
  } catch (error) {
    return { stdout: Buffer.alloc(0), stderr: Buffer.from(error.message || ""), error };
  }
}

export function parsePorcelainStatus(porcelainBuffer) {
  const text = porcelainBuffer.toString("utf8");
  const lines = text.split("\n").filter(Boolean);
  const staged = [];
  const unstaged = [];
  const untracked = [];

  for (const line of lines) {
    if (line.length < 4) continue;
    const x = line[0];
    const y = line[1];
    let file = line.slice(3).trim();
    if (file.includes(" -> ")) {
      file = file.split(" -> ")[1].trim();
    }
    file = file.replace(/^"|"$/g, "");

    if (x === "?" && y === "?") {
      untracked.push(file);
    } else {
      if (x !== " " && x !== "?") {
        staged.push({ file, status: x });
      }
      if (y !== " " && y !== "?") {
        unstaged.push({ file, status: y });
      }
    }
  }

  return { staged, unstaged, untracked };
}

export async function captureGitSnapshot({ cwd, proposedCommitMessage = "" } = {}) {
  const repoRoot = cwd || process.cwd();

  // 1. HEAD SHA
  const headRes = await runGit(["rev-parse", "HEAD"], repoRoot);
  const headSha = headRes.stdout.toString("utf8").trim() || "UNKNOWN";

  // 2. Current branch
  const branchRes = await runGit(["rev-parse", "--abbrev-ref", "HEAD"], repoRoot);
  const branch = branchRes.stdout.toString("utf8").trim() || "HEAD";

  // 3. Status porcelain
  const statusRes = await runGit(["status", "--porcelain"], repoRoot);
  const { staged, unstaged, untracked } = parsePorcelainStatus(statusRes.stdout);

  const stagedFilePaths = staged.map((s) => s.file);
  const unstagedFilePaths = unstaged.map((s) => s.file);

  // Check unstaged conflict: unstaged changes on files already staged
  const stagedSet = new Set(stagedFilePaths);
  const unstagedConflicts = unstagedFilePaths.filter((file) => stagedSet.has(file));
  const unrelatedUnstaged = unstagedFilePaths.filter((file) => !stagedSet.has(file));

  // 4. Staged diff content, size and hash
  const diffRes = await runGit(["diff", "--cached", "--binary"], repoRoot);
  const diffBuffer = diffRes.stdout;
  const diffSizeBytes = diffBuffer.length;

  const hash = crypto.createHash("sha256");
  hash.update(diffBuffer);
  const snapshotHash = hash.digest("hex");

  // 5. Recent commits (last 20)
  const logRes = await runGit(["log", "-n", "20", "--format=%H %s"], repoRoot);
  const logLines = logRes.stdout.toString("utf8").split("\n").filter(Boolean);
  const recentCommits = logLines.map((line) => {
    const spaceIndex = line.indexOf(" ");
    return {
      sha: spaceIndex !== -1 ? line.slice(0, spaceIndex) : line,
      message: spaceIndex !== -1 ? line.slice(spaceIndex + 1) : "",
    };
  });

  // 6. Infer US ID & check for contradictions
  const proposedUsId = extractUsId(proposedCommitMessage);

  // Find recent US IDs from commit history
  const recentUsIds = [];
  for (const commit of recentCommits) {
    const id = extractUsId(commit.message);
    if (id && !recentUsIds.includes(id)) {
      recentUsIds.push(id);
    }
  }

  const primaryRecentUsId = recentUsIds[0] || null;

  let usId = proposedUsId || primaryRecentUsId;
  let isContradictoryUsId = false;

  if (proposedUsId && primaryRecentUsId && proposedUsId !== primaryRecentUsId) {
    isContradictoryUsId = true;
  }

  return {
    repoRoot,
    branch,
    headSha,
    stagedFiles: stagedFilePaths,
    stagedCount: stagedFilePaths.length,
    unstagedConflicts,
    unrelatedUnstaged,
    untracked,
    diffSizeBytes,
    snapshotHash,
    proposedCommitMessage,
    proposedUsId,
    recentUsIds,
    primaryRecentUsId,
    usId,
    isContradictoryUsId,
    diffTooLarge: diffSizeBytes > MAX_DIFF_SIZE_BYTES,
    tooManyFiles: stagedFilePaths.length > MAX_STAGED_FILES,
  };
}
