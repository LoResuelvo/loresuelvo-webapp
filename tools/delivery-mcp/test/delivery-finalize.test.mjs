import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { finalizeDelivery } from "../lib/delivery-finalize.mjs";
import { MockCiProvider } from "../lib/ci-provider.mjs";
import { recordCommitEvidence } from "../lib/delivery-ledger.mjs";
import { runPrePushHook } from "../lib/git-hooks.mjs";

async function createTempGitRepo(t) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-finalize-test-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));

  execFileSync("git", ["init", "-b", "main"], { cwd: repoRoot });
  execFileSync("git", ["config", "user.name", "Tester"], { cwd: repoRoot });
  execFileSync("git", ["config", "user.email", "tester@example.com"], { cwd: repoRoot });
  execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: repoRoot });

  await fs.mkdir(path.join(repoRoot, ".delivery", "runtime", "records"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, ".delivery", "schemas"), { recursive: true });
  await fs.copyFile(".delivery/policy.v1.json", path.join(repoRoot, ".delivery", "policy.v1.json"));
  await fs.copyFile(
    ".delivery/schemas/ci-inspection-result.schema.json",
    path.join(repoRoot, ".delivery", "schemas", "ci-inspection-result.schema.json")
  );
  await fs.copyFile(".gitignore", path.join(repoRoot, ".gitignore"));

  await fs.writeFile(path.join(repoRoot, "README.md"), "# Initial\n", "utf8");
  execFileSync("git", ["add", "."], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "chore: initial commit"], { cwd: repoRoot });

  return repoRoot;
}

test("finalizeDelivery: bloquea si falta Gate D local aprobado en ledger", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  const headSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();

  // Record Gate A instead of Gate D
  const recordPath = ".delivery/runtime/records/run-gate-a.json";
  await fs.writeFile(
    path.join(repoRoot, recordPath),
    JSON.stringify({
      schemaVersion: 1,
      status: "passed",
      gate: { id: "A" },
    }),
    "utf8"
  );
  await recordCommitEvidence({
    repoRoot,
    commitSha: headSha,
    snapshotHash: "hash123",
    runKey: "key123",
    recordPath,
  });

  const res = await finalizeDelivery({ repoRoot, intent: "close_us" });
  assert.strictEqual(res.finalized, false);
  assert.strictEqual(res.reason, "GATE_D_REQUIRED");
});

test("finalizeDelivery: bloquea si quedan tags @wip en el scope", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const headSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();

  // Create Gate D record
  const recordPath = ".delivery/runtime/records/run-gate-d.json";
  await fs.writeFile(
    path.join(repoRoot, recordPath),
    JSON.stringify({
      schemaVersion: 1,
      status: "passed",
      gate: { id: "D" },
    }),
    "utf8"
  );
  await recordCommitEvidence({
    repoRoot,
    commitSha: headSha,
    snapshotHash: "hash123",
    runKey: "key123",
    recordPath,
  });

  // Feature file with @wip
  const featurePath = "features/sample.feature";
  await fs.mkdir(path.join(repoRoot, "features"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, featurePath),
    "Feature: Test\n  @wip\n  Scenario: One\n    Given something\n",
    "utf8"
  );

  const res = await finalizeDelivery({
    repoRoot,
    intent: "close_us",
    scopeFiles: [featurePath],
  });

  assert.strictEqual(res.finalized, false);
  assert.strictEqual(res.reason, "WIP_IN_SCOPE");
  assert.ok(res.locations.some((l) => l.includes("features/sample.feature:2")));
});

test("finalizeDelivery: aprueba cuando se cumplen las 4 condiciones (Gate D, clean scope, commits, CI verde)", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const headSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();

  // 1. Gate D in ledger
  const recordPath = ".delivery/runtime/records/run-gate-d.json";
  await fs.writeFile(
    path.join(repoRoot, recordPath),
    JSON.stringify({
      schemaVersion: 1,
      status: "passed",
      gate: { id: "D" },
    }),
    "utf8"
  );
  await recordCommitEvidence({
    repoRoot,
    commitSha: headSha,
    snapshotHash: "hash123",
    runKey: "key123",
    recordPath,
  });

  // 2. Clean feature file (no @wip)
  const featurePath = "features/clean.feature";
  await fs.mkdir(path.join(repoRoot, "features"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, featurePath),
    "Feature: Clean\n  Scenario: One\n    Given ok\n",
    "utf8"
  );

  // 3. Mock CI returning passed
  const mockCi = new MockCiProvider({
    [headSha]: { status: "passed", workflow: { id: 999, name: "CI" } },
  });

  // Allow unpushed check in isolated test repo without remote
  process.env.DELIVERY_ALLOW_UNPUSHED_FINALIZE = "1";
  try {
    const res = await finalizeDelivery({
      repoRoot,
      intent: "close_us",
      usId: "US-01",
      scopeFiles: [featurePath],
      ciProvider: mockCi,
    });

    assert.strictEqual(res.finalized, true);
    assert.strictEqual(res.status, "passed");
    assert.strictEqual(res.usId, "US-01");
    assert.strictEqual(res.headSha, headSha);
  } finally {
    delete process.env.DELIVERY_ALLOW_UNPUSHED_FINALIZE;
  }
});

test("pre-push: bloquea nuevos pushes si un commit previo del ledger falló en CI", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  // Commit 1 (previous commit with failed CI)
  const sha1 = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  await recordCommitEvidence({
    repoRoot,
    commitSha: sha1,
    snapshotHash: "hash1",
    runKey: "key1",
    recordPath: "rec1",
  });

  // Commit 2 (new commit being pushed)
  await fs.writeFile(path.join(repoRoot, "newfile.txt"), "hello", "utf8");
  execFileSync("git", ["add", "newfile.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "chore: new commit"], { cwd: repoRoot });
  const sha2 = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  await recordCommitEvidence({
    repoRoot,
    commitSha: sha2,
    snapshotHash: "hash2",
    runKey: "key2",
    recordPath: "rec2",
  });

  // Mock CI where sha1 failed
  const mockCi = new MockCiProvider({
    [sha1]: { status: "failed", failure: { message: "Test suite failed" } },
    [sha2]: { status: "passed" },
  });

  const stdinLine = `refs/heads/main ${sha2} refs/heads/main ${sha1}`;
  const prePushResult = await runPrePushHook({
    repoRoot,
    stdinLines: [stdinLine],
    ciProvider: mockCi,
  });

  assert.strictEqual(prePushResult.passed, false);
  assert.strictEqual(prePushResult.reason, "PRIOR_COMMIT_CI_FAILED");
});

test("pre-push: respeta la ventana máxima de commits con CI pendiente", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  // Commit 1
  const sha1 = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  await recordCommitEvidence({ repoRoot, commitSha: sha1, snapshotHash: "h1", runKey: "k1", recordPath: "r1" });

  // Commit 2
  await fs.writeFile(path.join(repoRoot, "f2.txt"), "2", "utf8");
  execFileSync("git", ["add", "f2.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "chore: c2"], { cwd: repoRoot });
  const sha2 = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  await recordCommitEvidence({ repoRoot, commitSha: sha2, snapshotHash: "h2", runKey: "k2", recordPath: "r2" });

  // Commit 3
  await fs.writeFile(path.join(repoRoot, "f3.txt"), "3", "utf8");
  execFileSync("git", ["add", "f3.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "chore: c3"], { cwd: repoRoot });
  const sha3 = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  await recordCommitEvidence({ repoRoot, commitSha: sha3, snapshotHash: "h3", runKey: "k3", recordPath: "r3" });

  // Commit 4 (being pushed)
  await fs.writeFile(path.join(repoRoot, "f4.txt"), "4", "utf8");
  execFileSync("git", ["add", "f4.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "chore: c4"], { cwd: repoRoot });
  const sha4 = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  await recordCommitEvidence({ repoRoot, commitSha: sha4, snapshotHash: "h4", runKey: "k4", recordPath: "r4" });

  // Mock CI: sha1, sha2, sha3 all in_progress (total 3 pending > window default 2)
  const mockCi = new MockCiProvider({
    [sha1]: { status: "in_progress" },
    [sha2]: { status: "in_progress" },
    [sha3]: { status: "in_progress" },
  });

  const stdinLine = `refs/heads/main ${sha4} refs/heads/main ${sha3}`;
  const prePushResult = await runPrePushHook({
    repoRoot,
    stdinLines: [stdinLine],
    ciProvider: mockCi,
  });

  assert.strictEqual(prePushResult.passed, false);
  assert.strictEqual(prePushResult.reason, "CI_PENDING_WINDOW_EXCEEDED");
});
