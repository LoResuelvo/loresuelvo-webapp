import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
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
  for (const schema of ["ci-inspection-result.schema.json", "execution-result.schema.json"]) {
    await fs.copyFile(
      path.join(".delivery", "schemas", schema),
      path.join(repoRoot, ".delivery", "schemas", schema)
    );
  }
  await fs.copyFile(".gitignore", path.join(repoRoot, ".gitignore"));

  await fs.writeFile(path.join(repoRoot, "README.md"), "# Initial\n", "utf8");
  execFileSync("git", ["add", "."], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "chore: initial commit"], { cwd: repoRoot });
  return repoRoot;
}

function headSha(repoRoot) {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
}

async function commitFile(repoRoot, relativePath, content, message) {
  await fs.mkdir(path.dirname(path.join(repoRoot, relativePath)), { recursive: true });
  await fs.writeFile(path.join(repoRoot, relativePath), content, "utf8");
  execFileSync("git", ["add", relativePath], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", message], { cwd: repoRoot });
  return headSha(repoRoot);
}

async function attachEvidence({ repoRoot, sha, gateId = "A", scopeFeatures = [], usId = null }) {
  const parentsLine = execFileSync("git", ["rev-list", "--parents", "-n", "1", sha], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
  const [, ...parents] = parentsLine.split(/\s+/).filter(Boolean);
  const treeSha = execFileSync("git", ["rev-parse", `${sha}^{tree}`], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
  const changedRaw = execFileSync(
    "git",
    ["diff-tree", "--root", "--no-commit-id", "--name-only", "-r", "-z", sha],
    { cwd: repoRoot, encoding: "buffer" }
  );
  const stagedFiles = changedRaw.toString("utf8").split("\0").filter(Boolean).sort();
  const snapshotHash = crypto.createHash("sha256").update(`snapshot:${sha}`).digest("hex");
  const runKey = crypto.createHash("sha256").update(`run:${sha}:${gateId}`).digest("hex");
  const recordPath = `.delivery/runtime/records/${sha}-${gateId}.json`;
  const policyHash = crypto.createHash("sha256").update("test-policy").digest("hex");
  const record = {
    schemaVersion: 1,
    status: "passed",
    snapshotHash,
    runKey,
    cached: false,
    policy: { version: 1, hash: policyHash },
    gate: {
      id: gateId,
      reasonCodes: ["TEST_EVIDENCE"],
      checkIds: [],
      parameters: { scopeFeatures },
      postPushChecks: gateId === "D" ? ["ci_green"] : [],
    },
    summary: { passed: 0, failed: 0, skipped: 0, durationMs: 0 },
    checks: [],
    diagnostics: [],
    evidence: { recordPath },
  };
  const rawRecord = `${JSON.stringify(record, null, 2)}\n`;
  await fs.writeFile(path.join(repoRoot, recordPath), rawRecord, "utf8");

  return recordCommitEvidence({
    repoRoot,
    commitSha: sha,
    snapshotHash,
    runKey,
    recordPath,
    recordDigest: crypto.createHash("sha256").update(rawRecord).digest("hex"),
    branch: "main",
    parentSha: parents[0] || null,
    treeSha,
    stagedFiles,
    gateId,
    policyHash,
    intent: gateId === "D" ? "close_us" : "prepare_commit",
    usId,
    scopeFiles: scopeFeatures,
  });
}

async function finalizeInIsolatedRepo(options) {
  const previous = process.env.DELIVERY_ALLOW_UNPUSHED_FINALIZE;
  process.env.DELIVERY_ALLOW_UNPUSHED_FINALIZE = "1";
  try {
    return await finalizeDelivery(options);
  } finally {
    if (previous === undefined) delete process.env.DELIVERY_ALLOW_UNPUSHED_FINALIZE;
    else process.env.DELIVERY_ALLOW_UNPUSHED_FINALIZE = previous;
  }
}

test("finalizeDelivery: bloquea si falta Gate D local aprobado en HEAD", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const sha = headSha(repoRoot);
  await attachEvidence({ repoRoot, sha, gateId: "A" });

  const res = await finalizeInIsolatedRepo({ repoRoot, intent: "close_us" });
  assert.strictEqual(res.finalized, false);
  assert.strictEqual(res.reason, "GATE_D_REQUIRED");
});

test("finalizeDelivery: inspecciona el scope comprometido y bloquea @wip", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const featurePath = "features/sample.feature";
  const sha = await commitFile(
    repoRoot,
    featurePath,
    "Feature: Test\n  @wip\n  Scenario: One\n    Given something\n",
    "test[01]: add pending scenario"
  );
  await attachEvidence({ repoRoot, sha, gateId: "D", scopeFeatures: [featurePath], usId: "01" });

  const res = await finalizeInIsolatedRepo({
    repoRoot,
    intent: "close_us",
    usId: "01",
    scopeFiles: [featurePath],
  });
  assert.strictEqual(res.finalized, false);
  assert.strictEqual(res.reason, "WIP_IN_SCOPE");
  assert.ok(res.locations.includes("features/sample.feature:2"));
});

test("finalizeDelivery: aprueba Gate D, scope exacto, evidencia y CI verde", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const featurePath = "features/clean.feature";
  const sha = await commitFile(
    repoRoot,
    featurePath,
    "Feature: Clean\n  Scenario: One\n    Given ok\n",
    "test[01]: close clean scenario"
  );
  await attachEvidence({ repoRoot, sha, gateId: "D", scopeFeatures: [featurePath], usId: "01" });
  const mockCi = new MockCiProvider({
    [sha]: { status: "passed", workflow: { id: 999, name: "CI" } },
  });

  const res = await finalizeInIsolatedRepo({
    repoRoot,
    intent: "close_us",
    usId: "01",
    scopeFiles: [featurePath],
    ciProvider: mockCi,
  });
  assert.strictEqual(res.finalized, true);
  assert.strictEqual(res.status, "passed");
  assert.deepStrictEqual(res.shas, [sha]);
  assert.deepStrictEqual(res.ci.map((ci) => ci.status), ["passed"]);
});

test("finalizeDelivery: solo CI passed puede cerrar", async (t) => {
  for (const status of ["not_found", "cancelled", "timed_out", "provider_error"]) {
    await t.test(status, async (subtest) => {
      const repoRoot = await createTempGitRepo(subtest);
      const featurePath = "features/clean.feature";
      const sha = await commitFile(
        repoRoot,
        featurePath,
        "Feature: Clean\n  Scenario: One\n    Given ok\n",
        "test[02]: close clean scenario"
      );
      await attachEvidence({ repoRoot, sha, gateId: "D", scopeFeatures: [featurePath], usId: "02" });
      const mockCi = new MockCiProvider({ [sha]: { status } });

      const res = await finalizeInIsolatedRepo({
        repoRoot,
        usId: "02",
        scopeFiles: [featurePath],
        ciProvider: mockCi,
      });
      assert.strictEqual(res.finalized, false);
      assert.strictEqual(res.reason, "CI_NOT_GREEN");
    });
  }
});

test("finalizeDelivery: bloquea un scope distinto del verificado por Gate D", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const featurePath = "features/clean.feature";
  const sha = await commitFile(
    repoRoot,
    featurePath,
    "Feature: Clean\n  Scenario: One\n    Given ok\n",
    "test[03]: close scenario"
  );
  await attachEvidence({ repoRoot, sha, gateId: "D", scopeFeatures: [featurePath], usId: "03" });

  const res = await finalizeInIsolatedRepo({
    repoRoot,
    usId: "03",
    scopeFiles: ["features/other.feature"],
  });
  assert.strictEqual(res.finalized, false);
  assert.strictEqual(res.reason, "SCOPE_EVIDENCE_MISMATCH");
});

test("pre-push: bloquea nuevos pushes si un commit previo falló en CI", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const sha1 = headSha(repoRoot);
  await attachEvidence({ repoRoot, sha: sha1 });
  const sha2 = await commitFile(repoRoot, "newfile.txt", "hello", "chore: new commit");
  await attachEvidence({ repoRoot, sha: sha2 });

  const mockCi = new MockCiProvider({
    [sha1]: { status: "failed", failure: { message: "Test suite failed" } },
    [sha2]: { status: "passed" },
  });
  const result = await runPrePushHook({
    repoRoot,
    stdinLines: [`refs/heads/main ${sha2} refs/heads/main ${sha1}`],
    ciProvider: mockCi,
  });
  assert.strictEqual(result.passed, false);
  assert.strictEqual(result.reason, "PRIOR_COMMIT_CI_FAILED");
});

test("pre-push: respeta la ventana máxima de commits con CI pendiente", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const sha1 = headSha(repoRoot);
  await attachEvidence({ repoRoot, sha: sha1 });
  const sha2 = await commitFile(repoRoot, "f2.txt", "2", "chore: c2");
  await attachEvidence({ repoRoot, sha: sha2 });
  const sha3 = await commitFile(repoRoot, "f3.txt", "3", "chore: c3");
  await attachEvidence({ repoRoot, sha: sha3 });
  const sha4 = await commitFile(repoRoot, "f4.txt", "4", "chore: c4");
  await attachEvidence({ repoRoot, sha: sha4 });

  const mockCi = new MockCiProvider({
    [sha1]: { status: "in_progress" },
    [sha2]: { status: "in_progress" },
    [sha3]: { status: "in_progress" },
  });
  const result = await runPrePushHook({
    repoRoot,
    stdinLines: [`refs/heads/main ${sha4} refs/heads/main ${sha3}`],
    ciProvider: mockCi,
  });
  assert.strictEqual(result.passed, false);
  assert.strictEqual(result.reason, "CI_PENDING_WINDOW_EXCEEDED");
});
