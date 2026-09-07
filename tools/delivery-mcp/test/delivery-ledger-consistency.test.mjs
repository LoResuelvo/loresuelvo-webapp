import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  acquireLedgerLock,
  getLedgerState,
  LEDGER_DIR,
  LEDGER_FILE,
  listCommitEvidence,
} from "../lib/delivery-ledger.mjs";

async function createTempGitRepo(t) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-ledger-consistency-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));

  execFileSync("git", ["init", "-b", "main"], { cwd: repoRoot });
  return repoRoot;
}

function notRunEntry(commitSha, notRunReason) {
  return {
    schemaVersion: 2,
    commitSha,
    status: "not_run",
    verificationStatus: "not_run",
    notRunReason,
    branch: "main",
    parentSha: null,
    treeSha: "b".repeat(40),
    stagedFiles: [],
    usId: "35.5",
    recordedAt: new Date().toISOString(),
    snapshotHash: null,
    runKey: null,
    recordPath: null,
    recordDigest: null,
    gateId: null,
    policyHash: null,
    intent: null,
    featureFile: null,
    scenarioName: null,
    scopeFiles: [],
    repairsSha: null,
    supersedes: [],
    repairStatus: null,
    repairedFailure: null,
    repairAuthState: null,
    repairAuthSha: null,
    repairPushConsumed: false,
    repairPushConsumedAt: null,
  };
}

async function writeLedgerPair(repoRoot, entry) {
  await fs.mkdir(path.join(repoRoot, LEDGER_DIR), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, LEDGER_DIR, `${entry.commitSha}.json`),
    `${JSON.stringify(entry, null, 2)}\n`,
    "utf8"
  );
  await fs.writeFile(
    path.join(repoRoot, LEDGER_FILE),
    `${JSON.stringify({ [entry.commitSha]: entry }, null, 2)}\n`,
    "utf8"
  );
}

test("listCommitEvidence y getLedgerState esperan la transacción del ledger y no ven una divergencia transitoria", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const commitSha = "a".repeat(40);
  const oldEntry = notRunEntry(commitSha, "old");
  const newEntry = notRunEntry(commitSha, "new");
  await writeLedgerPair(repoRoot, oldEntry);

  const release = await acquireLedgerLock({ repoRoot });
  let listPromise;
  let statePromise;
  try {
    // Simulate the state between the two writes of a ledger transaction. The
    // readers must wait for the writer lock instead of reporting a false
    // mismatch.
    await fs.writeFile(
      path.join(repoRoot, LEDGER_DIR, `${commitSha}.json`),
      `${JSON.stringify(newEntry, null, 2)}\n`,
      "utf8"
    );

    let listSettled = false;
    let stateSettled = false;
    listPromise = listCommitEvidence({ repoRoot }).then((value) => {
      listSettled = true;
      return value;
    });
    statePromise = getLedgerState({ repoRoot }).then((value) => {
      stateSettled = true;
      return value;
    });

    await new Promise((resolve) => setTimeout(resolve, 75));
    assert.equal(listSettled, false);
    assert.equal(stateSettled, false);

    await fs.writeFile(
      path.join(repoRoot, LEDGER_FILE),
      `${JSON.stringify({ [commitSha]: newEntry }, null, 2)}\n`,
      "utf8"
    );
  } finally {
    await release();
  }

  const [entries, state] = await Promise.all([listPromise, statePromise]);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].notRunReason, "new");
  assert.equal(state.state, "VALID_LEDGER");
});

test("listCommitEvidence puede reconstruir el consolidado bajo su propio lock sin reentrancia", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const commitSha = "c".repeat(40);
  const entry = notRunEntry(commitSha, "rebuild");
  await fs.mkdir(path.join(repoRoot, LEDGER_DIR), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, LEDGER_DIR, `${commitSha}.json`),
    `${JSON.stringify(entry, null, 2)}\n`,
    "utf8"
  );

  const entries = await listCommitEvidence({ repoRoot });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].commitSha, commitSha);
  assert.equal((await getLedgerState({ repoRoot })).state, "VALID_LEDGER");
});
