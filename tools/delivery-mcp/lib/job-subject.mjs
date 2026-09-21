import crypto from "node:crypto";
import { runGit } from "./git-snapshot.mjs";
import { findRepoRoot } from "./repo-root.mjs";

export const JOB_SUBJECT_KINDS = Object.freeze({
  WORKING_TREE: "working_tree",
  STAGED_SNAPSHOT: "staged_snapshot",
  HEAD: "head",
});

function subjectIdentity({
  kind,
  headSha,
  stagedTreeSha = null,
  snapshotHash = null,
  inputFingerprint = null,
}) {
  return {
    kind,
    headSha,
    stagedTreeSha,
    snapshotHash,
    inputFingerprint,
  };
}

export function createHeadJobSubject(headSha) {
  return subjectIdentity({ kind: JOB_SUBJECT_KINDS.HEAD, headSha });
}

export function createStagedSnapshotJobSubject(snapshot) {
  return subjectIdentity({
    kind: JOB_SUBJECT_KINDS.STAGED_SNAPSHOT,
    headSha: snapshot?.headSha,
    stagedTreeSha: snapshot?.stagedTreeSha,
    snapshotHash: snapshot?.snapshotHash,
  });
}

export function createWorkingTreeJobSubject(inputFingerprint) {
  return subjectIdentity({
    kind: JOB_SUBJECT_KINDS.WORKING_TREE,
    headSha: inputFingerprint?.headSha,
    inputFingerprint: inputFingerprint?.hash,
  });
}

function gitValue(result, operation) {
  if (result.error) {
    const error = new Error(`Unable to read job subject identity (${operation})`);
    error.code = "JOB_SUBJECT_READ_FAILED";
    throw error;
  }
  return result.stdout.toString("utf8").trim();
}

async function readHeadSha(repoRoot) {
  return gitValue(await runGit(["rev-parse", "HEAD"], repoRoot), "HEAD");
}

async function readStagedIdentity(repoRoot) {
  const [diffResult, treeResult] = await Promise.all([
    runGit(["diff", "--cached", "--binary"], repoRoot),
    runGit(["write-tree"], repoRoot),
  ]);
  const diff = diffResult.error
    ? gitValue(diffResult, "staged diff")
    : diffResult.stdout;
  return {
    snapshotHash: crypto.createHash("sha256").update(diff).digest("hex"),
    stagedTreeSha: gitValue(treeResult, "staged tree"),
  };
}

function mismatch(code, label, expected, actual) {
  return {
    valid: false,
    code,
    message: `${label} changed after the delivery job was queued`,
    expected: expected || null,
    actual: actual || null,
  };
}

export async function validateJobSubject({
  repoRoot,
  subject,
  computeWorkingTreeFingerprint,
}) {
  const root = findRepoRoot(repoRoot);
  if (!subject || typeof subject !== "object" || !subject.kind || !subject.headSha) {
    return mismatch(
      "JOB_SUBJECT_MISSING",
      "Delivery job subject identity",
      subject?.headSha,
      null
    );
  }

  const currentHeadSha = await readHeadSha(root);
  if (currentHeadSha !== subject.headSha) {
    return mismatch("JOB_HEAD_MISMATCH", "HEAD", subject.headSha, currentHeadSha);
  }

  if (subject.kind === JOB_SUBJECT_KINDS.HEAD) {
    return { valid: true };
  }

  if (subject.kind === JOB_SUBJECT_KINDS.STAGED_SNAPSHOT) {
    const current = await readStagedIdentity(root);
    if (
      current.snapshotHash !== subject.snapshotHash ||
      current.stagedTreeSha !== subject.stagedTreeSha
    ) {
      return mismatch(
        "JOB_STAGED_SNAPSHOT_MISMATCH",
        "Staged snapshot",
        `${subject.stagedTreeSha}:${subject.snapshotHash}`,
        `${current.stagedTreeSha}:${current.snapshotHash}`
      );
    }
    return { valid: true };
  }

  if (subject.kind === JOB_SUBJECT_KINDS.WORKING_TREE) {
    if (typeof computeWorkingTreeFingerprint !== "function") {
      return mismatch(
        "JOB_SUBJECT_INVALID",
        "Working-tree fingerprint contract",
        subject.inputFingerprint,
        null
      );
    }
    const current = await computeWorkingTreeFingerprint(root);
    if (current.hash !== subject.inputFingerprint) {
      return mismatch(
        "JOB_WORKTREE_INPUT_MISMATCH",
        "Relevant delivery_test input",
        subject.inputFingerprint,
        current.hash
      );
    }
    return { valid: true };
  }

  return mismatch("JOB_SUBJECT_INVALID", "Delivery job subject kind", subject.kind, null);
}
