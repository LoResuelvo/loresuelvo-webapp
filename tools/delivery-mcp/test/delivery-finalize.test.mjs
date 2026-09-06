import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { finalizeDelivery, verifyHeadDelivery } from "../lib/delivery-finalize.mjs";
import { MockCiProvider } from "../lib/ci-provider.mjs";
import { recordCommitEvidence } from "../lib/delivery-ledger.mjs";
import { runPrePushHook } from "../lib/git-hooks.mjs";
import { saveDeliveryContext } from "../lib/delivery-context.mjs";

async function createTempGitRepo(t) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-finalize-test-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));

  execFileSync("git", ["init", "-b", "main"], { cwd: repoRoot });
  execFileSync("git", ["config", "user.name", "Tester"], { cwd: repoRoot });
  execFileSync("git", ["config", "user.email", "tester@example.com"], { cwd: repoRoot });
  execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: repoRoot });

  await fs.mkdir(path.join(repoRoot, ".delivery", "runtime", "records"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, ".delivery", "schemas"), { recursive: true });
  for (const schema of [
    "ci-inspection-result.schema.json",
    "delivery-context.schema.json",
    "execution-result.schema.json",
    "policy.schema.json",
  ]) {
    await fs.copyFile(
      path.join(".delivery", "schemas", schema),
      path.join(repoRoot, ".delivery", "schemas", schema)
    );
  }
  await fs.copyFile(
    path.join(".delivery", "policy.v1.json"),
    path.join(repoRoot, ".delivery", "policy.v1.json")
  );
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

async function attachEvidence({
  repoRoot,
  sha,
  gateId = "A",
  scopeFeatures = [],
  usId = null,
  intent = gateId === "D" ? "close_us" : gateId === "R" ? "repair_ci" : "prepare_commit",
  repairsSha = null,
  supersedes = [],
  repairStatus = null,
  policyHash: customPolicyHash = null,
}) {
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
  let policyHash = customPolicyHash;
  if (!policyHash) {
    try {
      const rawPol = await fs.readFile(path.join(repoRoot, ".delivery", "policy.v1.json"), "utf8");
      policyHash = crypto.createHash("sha256").update(rawPol).digest("hex");
    } catch {
      policyHash = crypto.createHash("sha256").update("test-policy").digest("hex");
    }
  }
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
    intent,
    usId,
    scopeFiles: scopeFeatures,
    repairsSha,
    supersedes,
    repairStatus,
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

test("finalizeDelivery: close_batch permite continuar con CI pendiente", async (t) => {
  for (const status of ["queued", "in_progress", "not_found"]) {
    await t.test(status, async (subtest) => {
      const repoRoot = await createTempGitRepo(subtest);
      const featurePath = `features/batch-${status}.feature`;
      const sha = await commitFile(
        repoRoot,
        featurePath,
        "Feature: Batch\n  Scenario: Done\n    Given ok\n",
        "test[01]: close batch"
      );
      await attachEvidence({
        repoRoot,
        sha,
        gateId: "D",
        scopeFeatures: [featurePath],
        usId: "01",
        intent: "close_batch",
      });

      const res = await finalizeInIsolatedRepo({
        repoRoot,
        intent: "close_batch",
        usId: "01",
        scopeFiles: [featurePath],
        ciProvider: new MockCiProvider({ [sha]: { status } }),
      });

      assert.strictEqual(res.finalized, true);
      assert.strictEqual(res.status, "passed_pending_ci");
      assert.strictEqual(res.remoteVerification, "pending");
      assert.deepStrictEqual(res.pendingCi.map((ci) => ci.sha), [sha]);
      assert.deepStrictEqual(res.pendingCi.map((ci) => ci.status), [status]);
    });
  }
});

test("finalizeDelivery: close_batch bloquea un CI conocido como fallido", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const featurePath = "features/failed-batch.feature";
  const sha = await commitFile(
    repoRoot,
    featurePath,
    "Feature: Batch\n  Scenario: Done\n    Given ok\n",
    "test[01]: close failed batch"
  );
  await attachEvidence({
    repoRoot,
    sha,
    gateId: "D",
    scopeFeatures: [featurePath],
    usId: "01",
    intent: "close_batch",
  });

  const res = await finalizeInIsolatedRepo({
    repoRoot,
    intent: "close_batch",
    usId: "01",
    scopeFiles: [featurePath],
    ciProvider: new MockCiProvider({ [sha]: { status: "failed" } }),
  });

  assert.strictEqual(res.finalized, false);
  assert.strictEqual(res.reason, "CI_NOT_GREEN");
});

test("finalizeDelivery: close_batch respeta la ventana de cuatro commits en vuelo", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const shas = [];

  for (let index = 1; index <= 4; index += 1) {
    const sha = await commitFile(
      repoRoot,
      `src/batch-${index}.txt`,
      String(index),
      `chore[20]: add batch part ${index}`
    );
    await attachEvidence({ repoRoot, sha, gateId: "A", usId: "20" });
    shas.push(sha);
  }

  const featurePath = "features/batch-window.feature";
  const head = await commitFile(
    repoRoot,
    featurePath,
    "Feature: Batch window\n  Scenario: Done\n    Given ok\n",
    "test[20]: close batch window"
  );
  await attachEvidence({
    repoRoot,
    sha: head,
    gateId: "D",
    scopeFeatures: [featurePath],
    usId: "20",
    intent: "close_batch",
  });
  shas.push(head);

  const fixtures = Object.fromEntries(shas.map((sha) => [sha, { status: "in_progress" }]));
  const res = await finalizeInIsolatedRepo({
    repoRoot,
    intent: "close_batch",
    usId: "20",
    scopeFiles: [featurePath],
    ciProvider: new MockCiProvider(fixtures),
  });

  assert.strictEqual(res.finalized, false);
  assert.strictEqual(res.reason, "CI_PENDING_WINDOW_EXCEEDED");
  assert.strictEqual(res.pendingCi.length, 5);
  assert.strictEqual(res.maxInFlightCommits, 4);
});

test("finalizeDelivery: close_us sigue esperando un CI en progreso", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const featurePath = "features/pending-us.feature";
  const sha = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US\n  Scenario: Done\n    Given ok\n",
    "test[01]: close pending us"
  );
  await attachEvidence({ repoRoot, sha, gateId: "D", scopeFeatures: [featurePath], usId: "01" });

  const res = await finalizeInIsolatedRepo({
    repoRoot,
    intent: "close_us",
    usId: "01",
    scopeFiles: [featurePath],
    ciProvider: new MockCiProvider({ [sha]: { status: "in_progress" } }),
  });

  assert.strictEqual(res.finalized, false);
  assert.strictEqual(res.status, "in_progress");
  assert.strictEqual(res.reason, "CI_IN_PROGRESS");
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

test("finalizeDelivery: usa la evidencia de HEAD y no un contexto local vencido", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const featurePath = "features/us04.feature";
  const sha = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US04\n  Scenario: Done\n    Given ok\n",
    "test[04]: close story"
  );
  await attachEvidence({ repoRoot, sha, gateId: "D", scopeFeatures: [featurePath], usId: "04" });
  await saveDeliveryContext({
    repoRoot,
    snapshot: {
      branch: "main",
      headSha: "0".repeat(40),
      snapshotHash: "1".repeat(64),
    },
    intent: "close_us",
    usId: "99",
    scopeFiles: ["features/stale.feature"],
  });

  const res = await finalizeInIsolatedRepo({
    repoRoot,
    ciProvider: new MockCiProvider({ [sha]: { status: "passed" } }),
  });

  assert.strictEqual(res.finalized, true);
  assert.strictEqual(res.usId, "04");
});

test("finalizeDelivery: exige que intent y US coincidan con la evidencia de HEAD", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const featurePath = "features/us05.feature";
  const sha = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US05\n  Scenario: Done\n    Given ok\n",
    "test[05]: close story"
  );
  await attachEvidence({
    repoRoot,
    sha,
    gateId: "D",
    scopeFeatures: [featurePath],
    usId: "05",
    intent: "close_scenario",
  });

  const intentMismatch = await finalizeInIsolatedRepo({
    repoRoot,
    intent: "close_us",
    usId: "05",
    scopeFiles: [featurePath],
  });
  assert.strictEqual(intentMismatch.finalized, false);
  assert.strictEqual(intentMismatch.reason, "INTENT_EVIDENCE_MISMATCH");

  await attachEvidence({
    repoRoot,
    sha,
    gateId: "D",
    scopeFeatures: [featurePath],
    usId: "05",
    intent: "close_us",
  });
  const usMismatch = await finalizeInIsolatedRepo({
    repoRoot,
    intent: "close_us",
    usId: "06",
    scopeFiles: [featurePath],
  });
  assert.strictEqual(usMismatch.finalized, false);
  assert.strictEqual(usMismatch.reason, "US_EVIDENCE_MISMATCH");
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

test("pre-push: permite exactamente cuatro commits totales con CI pendiente", async (t) => {
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
  assert.strictEqual(result.passed, true);
});

test("pre-push: bloquea un quinto commit total con CI pendiente", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const sha1 = headSha(repoRoot);
  await attachEvidence({ repoRoot, sha: sha1 });
  const sha2 = await commitFile(repoRoot, "f2.txt", "2", "chore: c2");
  await attachEvidence({ repoRoot, sha: sha2 });
  const sha3 = await commitFile(repoRoot, "f3.txt", "3", "chore: c3");
  await attachEvidence({ repoRoot, sha: sha3 });
  const sha4 = await commitFile(repoRoot, "f4.txt", "4", "chore: c4");
  await attachEvidence({ repoRoot, sha: sha4 });
  const sha5 = await commitFile(repoRoot, "f5.txt", "5", "chore: c5");
  await attachEvidence({ repoRoot, sha: sha5 });

  const mockCi = new MockCiProvider({
    [sha1]: { status: "in_progress" },
    [sha2]: { status: "in_progress" },
    [sha3]: { status: "in_progress" },
    [sha4]: { status: "in_progress" },
  });
  const result = await runPrePushHook({
    repoRoot,
    stdinLines: [`refs/heads/main ${sha5} refs/heads/main ${sha4}`],
    ciProvider: mockCi,
  });

  assert.strictEqual(result.passed, false);
  assert.strictEqual(result.reason, "CI_PENDING_WINDOW_EXCEEDED");
  assert.strictEqual(result.pendingCount, 4);
  assert.strictEqual(result.inFlightCount, 5);
  assert.strictEqual(result.maxInFlightCommits, 4);
});

async function attachNotRunEvidence({ repoRoot, sha, usId = null, reason = "human_commit_no_receipt" }) {
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

  return recordCommitEvidence({
    repoRoot,
    commitSha: sha,
    verificationStatus: "not_run",
    notRunReason: reason,
    branch: "main",
    parentSha: parents[0] || null,
    treeSha,
    stagedFiles,
    usId,
  });
}

test("finalizeDelivery: aprueba cierre con commit previo not_run si CI está passed y reporta unverifiedCommits", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const sha1 = await commitFile(repoRoot, "src/feature.txt", "code", "feat[10]: human commit without local gate");
  await attachNotRunEvidence({ repoRoot, sha: sha1, usId: "10" });

  const featurePath = "features/us10.feature";
  const sha2 = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US10\n  Scenario: Done\n    Given ok\n",
    "test[10]: finalize us10"
  );
  await attachEvidence({ repoRoot, sha: sha2, gateId: "D", scopeFeatures: [featurePath], usId: "10" });

  const mockCi = new MockCiProvider({
    [sha1]: { status: "passed" },
    [sha2]: { status: "passed" },
  });

  const res = await finalizeInIsolatedRepo({
    repoRoot,
    usId: "10",
    scopeFiles: [featurePath],
    ciProvider: mockCi,
  });

  assert.strictEqual(res.finalized, true);
  assert.strictEqual(res.status, "passed");
  assert.deepStrictEqual(res.shas, [sha2, sha1]);
  assert.deepStrictEqual(res.unverifiedCommits, [sha1]);
});

test("finalizeDelivery: deniega cierre con commit previo not_run si su CI no está passed", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const sha1 = await commitFile(repoRoot, "src/feature.txt", "code", "feat[11]: human commit without local gate");
  await attachNotRunEvidence({ repoRoot, sha: sha1, usId: "11" });

  const featurePath = "features/us11.feature";
  const sha2 = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US11\n  Scenario: Done\n    Given ok\n",
    "test[11]: finalize us11"
  );
  await attachEvidence({ repoRoot, sha: sha2, gateId: "D", scopeFeatures: [featurePath], usId: "11" });

  const mockCi = new MockCiProvider({
    [sha1]: { status: "failed", failure: { message: "CI failed for human commit" } },
    [sha2]: { status: "passed" },
  });

  const res = await finalizeInIsolatedRepo({
    repoRoot,
    usId: "11",
    scopeFiles: [featurePath],
    ciProvider: mockCi,
  });

  assert.strictEqual(res.finalized, false);
  assert.strictEqual(res.reason, "CI_NOT_GREEN");
  assert.strictEqual(res.sha, sha1);
});

test("finalizeDelivery: deniega cierre si un commit de la US no tiene registro en el ledger (missing)", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const sha1 = await commitFile(repoRoot, "src/feature.txt", "code", "feat[12]: unrecorded commit");

  const featurePath = "features/us12.feature";
  const sha2 = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US12\n  Scenario: Done\n    Given ok\n",
    "test[12]: finalize us12"
  );
  await attachEvidence({ repoRoot, sha: sha2, gateId: "D", scopeFeatures: [featurePath], usId: "12" });

  const mockCi = new MockCiProvider({
    [sha1]: { status: "passed" },
    [sha2]: { status: "passed" },
  });

  const res = await finalizeInIsolatedRepo({
    repoRoot,
    usId: "12",
    scopeFiles: [featurePath],
    ciProvider: mockCi,
  });

  assert.strictEqual(res.finalized, false);
  assert.strictEqual(res.reason, "MISSING_COMMIT_EVIDENCE");
  assert.strictEqual(res.sha, sha1);
});

test("finalizeDelivery: deniega cierre si un commit de la US tiene evidencia corrupta", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const sha1 = await commitFile(repoRoot, "src/feature.txt", "code", "feat[13]: corrupt commit");
  await attachEvidence({ repoRoot, sha: sha1, gateId: "A", usId: "13" });

  const recordPath = path.join(repoRoot, `.delivery/runtime/records/${sha1}-A.json`);
  const original = JSON.parse(await fs.readFile(recordPath, "utf8"));
  original.summary.durationMs = 8888;
  await fs.writeFile(recordPath, `${JSON.stringify(original, null, 2)}\n`, "utf8");

  const featurePath = "features/us13.feature";
  const sha2 = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US13\n  Scenario: Done\n    Given ok\n",
    "test[13]: finalize us13"
  );
  await attachEvidence({ repoRoot, sha: sha2, gateId: "D", scopeFeatures: [featurePath], usId: "13" });

  const mockCi = new MockCiProvider({
    [sha1]: { status: "passed" },
    [sha2]: { status: "passed" },
  });

  const res = await finalizeInIsolatedRepo({
    repoRoot,
    usId: "13",
    scopeFiles: [featurePath],
    ciProvider: mockCi,
  });

  assert.strictEqual(res.finalized, false);
  assert.strictEqual(res.reason, "CORRUPT_COMMIT_EVIDENCE");
  assert.strictEqual(res.sha, sha1);
});

test("finalizeDelivery: reparación válida aprueba close_us y reporta supersededFailures", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const sha1 = await commitFile(repoRoot, "src/f1.txt", "1", "feat[30]: failing commit");
  await attachEvidence({ repoRoot, sha: sha1, gateId: "A", usId: "30" });

  const sha2 = await commitFile(repoRoot, "src/f2.txt", "2", "fix[30]: repair commit");
  await attachEvidence({ repoRoot, sha: sha2, gateId: "R", usId: "30", repairsSha: sha1 });

  const featurePath = "features/us30.feature";
  const sha3 = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US30\n  Scenario: Done\n    Given ok\n",
    "test[30]: finalize us30"
  );
  await attachEvidence({ repoRoot, sha: sha3, gateId: "D", scopeFeatures: [featurePath], usId: "30" });

  const mockCi = new MockCiProvider({
    [sha1]: { status: "failed", failure: { message: "Build failed" } },
    [sha2]: { status: "passed" },
    [sha3]: { status: "passed" },
  });

  const res = await finalizeInIsolatedRepo({
    repoRoot,
    usId: "30",
    scopeFiles: [featurePath],
    ciProvider: mockCi,
  });

  assert.strictEqual(res.finalized, true);
  assert.strictEqual(res.status, "passed");
  assert.ok(res.supersededFailures.includes(sha1));
  assert.deepStrictEqual(res.pendingFailures, []);
  assert.deepStrictEqual(res.invalidRepairs, []);
});

test("finalizeDelivery: reparación fuera de la rama (no ancestro) es rechazada en invalidRepairs y bloquea close_us", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const initialSha = headSha(repoRoot);
  const sha1 = await commitFile(repoRoot, "src/f1.txt", "1", "feat[31]: failing commit");
  await attachEvidence({ repoRoot, sha: sha1, gateId: "A", usId: "31" });

  execFileSync("git", ["checkout", "-b", "isolated-branch", initialSha], { cwd: repoRoot });
  const featurePath = "features/us31.feature";
  const sha2 = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US31\n  Scenario: Done\n    Given ok\n",
    "test[31]: repair and finalize outside branch"
  );
  await attachEvidence({
    repoRoot,
    sha: sha2,
    gateId: "D",
    scopeFeatures: [featurePath],
    usId: "31",
    repairsSha: sha1,
  });

  const mockCi = new MockCiProvider({
    [sha1]: { status: "failed" },
    [sha2]: { status: "passed" },
  });

  const res = await finalizeInIsolatedRepo({
    repoRoot,
    usId: "31",
    scopeFiles: [featurePath],
    ciProvider: mockCi,
  });

  assert.strictEqual(res.finalized, false);
  assert.ok(res.invalidRepairs.length > 0);
  assert.strictEqual(res.invalidRepairs[0].reason, "REPAIR_NOT_DESCENDANT");
  assert.strictEqual(res.supersededFailures.length, 0);
});

test("finalizeDelivery: cadena de dos reparaciones (A falla -> B falla -> C pasa) subsana A y B, y close_us pasa", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const sha1 = await commitFile(repoRoot, "src/f1.txt", "1", "feat[32]: fail A");
  await attachEvidence({ repoRoot, sha: sha1, gateId: "A", usId: "32" });

  const sha2 = await commitFile(repoRoot, "src/f2.txt", "2", "fix[32]: repair B fails");
  await attachEvidence({ repoRoot, sha: sha2, gateId: "R", usId: "32", repairsSha: sha1 });

  const sha3 = await commitFile(repoRoot, "src/f3.txt", "3", "fix[32]: repair C passes");
  await attachEvidence({ repoRoot, sha: sha3, gateId: "R", usId: "32", repairsSha: sha2 });

  const featurePath = "features/us32.feature";
  const sha4 = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US32\n  Scenario: Done\n    Given ok\n",
    "test[32]: finalize us32"
  );
  await attachEvidence({ repoRoot, sha: sha4, gateId: "D", scopeFeatures: [featurePath], usId: "32" });

  const mockCi = new MockCiProvider({
    [sha1]: { status: "failed" },
    [sha2]: { status: "failed" },
    [sha3]: { status: "passed" },
    [sha4]: { status: "passed" },
  });

  const res = await finalizeInIsolatedRepo({
    repoRoot,
    usId: "32",
    scopeFiles: [featurePath],
    ciProvider: mockCi,
  });

  assert.strictEqual(res.finalized, true);
  assert.strictEqual(res.status, "passed");
  assert.ok(res.supersededFailures.includes(sha1));
  assert.ok(res.supersededFailures.includes(sha2));
  assert.deepStrictEqual(res.pendingFailures, []);
});

test("finalizeDelivery: reparación cuyo CI también falla bloquea close_us y reporta failedRepairs", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const sha1 = await commitFile(repoRoot, "src/f1.txt", "1", "feat[33]: fail A");
  await attachEvidence({ repoRoot, sha: sha1, gateId: "A", usId: "33" });

  const sha2 = await commitFile(repoRoot, "src/f2.txt", "2", "fix[33]: repair B also fails");
  await attachEvidence({ repoRoot, sha: sha2, gateId: "R", usId: "33", repairsSha: sha1 });

  const featurePath = "features/us33.feature";
  const sha3 = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US33\n  Scenario: Done\n    Given ok\n",
    "test[33]: finalize us33"
  );
  await attachEvidence({ repoRoot, sha: sha3, gateId: "D", scopeFeatures: [featurePath], usId: "33" });

  const mockCi = new MockCiProvider({
    [sha1]: { status: "failed" },
    [sha2]: { status: "failed" },
    [sha3]: { status: "passed" },
  });

  const res = await finalizeInIsolatedRepo({
    repoRoot,
    usId: "33",
    scopeFiles: [featurePath],
    ciProvider: mockCi,
  });

  assert.strictEqual(res.finalized, false);
  assert.strictEqual(res.reason, "CI_NOT_GREEN");
  assert.ok(res.failedRepairs.includes(sha2));
  assert.ok(res.pendingFailures.includes(sha2));
});

test("finalizeDelivery: fallo histórico sin relación de reparación explícita continúa bloqueando close_us", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const sha1 = await commitFile(repoRoot, "src/f1.txt", "1", "feat[34]: fail A");
  await attachEvidence({ repoRoot, sha: sha1, gateId: "A", usId: "34" });

  const sha2 = await commitFile(repoRoot, "src/f2.txt", "2", "chore[34]: normal subsequent commit");
  await attachEvidence({ repoRoot, sha: sha2, gateId: "A", usId: "34" });

  const featurePath = "features/us34.feature";
  const sha3 = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US34\n  Scenario: Done\n    Given ok\n",
    "test[34]: finalize us34"
  );
  await attachEvidence({ repoRoot, sha: sha3, gateId: "D", scopeFeatures: [featurePath], usId: "34" });

  const mockCi = new MockCiProvider({
    [sha1]: { status: "failed" },
    [sha2]: { status: "passed" },
    [sha3]: { status: "passed" },
  });

  const res = await finalizeInIsolatedRepo({
    repoRoot,
    usId: "34",
    scopeFiles: [featurePath],
    ciProvider: mockCi,
  });

  assert.strictEqual(res.finalized, false);
  assert.strictEqual(res.reason, "CI_NOT_GREEN");
  assert.strictEqual(res.supersededFailures.length, 0);
  assert.ok(res.pendingFailures.includes(sha1));
});

test("verifyHeadDelivery: verifica un HEAD existente y tras verify_head, finalizeDelivery(close_us) aprueba sin commits artificiales", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const featurePath = "features/us35.feature";
  const initialHead = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US35\n  Scenario: Done\n    Given ok\n",
    "test[35]: finalize us35 scenario without wip"
  );

  const mockPassedCheck = async ({ check, logPath }) => ({
    id: check.id,
    status: "passed",
    durationMs: 5,
    exitCode: 0,
    summaryLines: [],
    locations: [],
    logPath,
    diagnostic: null,
  });

  const verifyRes = await verifyHeadDelivery({
    repoRoot,
    intent: "close_us",
    usId: "35",
    scopeFiles: [featurePath],
    executeCheck: mockPassedCheck,
  });

  assert.strictEqual(verifyRes.verified, true);
  assert.strictEqual(verifyRes.status, "passed");
  assert.strictEqual(verifyRes.gate, "D");
  assert.strictEqual(verifyRes.cached, false);
  assert.strictEqual(verifyRes.headSha, initialHead);

  // Verify HEAD in git did NOT change (no artificial commit created)
  const currentHead = headSha(repoRoot);
  assert.strictEqual(currentHead, initialHead);

  // Now finalizeDelivery(close_us) succeeds on this HEAD
  const mockCi = new MockCiProvider({
    [initialHead]: { status: "passed" },
  });

  const finalizeRes = await finalizeInIsolatedRepo({
    repoRoot,
    intent: "close_us",
    usId: "35",
    scopeFiles: [featurePath],
    ciProvider: mockCi,
  });

  assert.strictEqual(finalizeRes.finalized, true);
  assert.strictEqual(finalizeRes.status, "passed");
  assert.strictEqual(finalizeRes.headSha, initialHead);
});

test("verifyHeadDelivery: idempotencia - segunda ejecución sobre el mismo HEAD devuelve cached: true sin re-ejecutar checks", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const featurePath = "features/us36.feature";
  const sha = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US36\n  Scenario: Done\n    Given ok\n",
    "test[36]: complete scenario"
  );

  let checkRunCount = 0;
  const mockCheck = async ({ check, logPath }) => {
    checkRunCount++;
    return {
      id: check.id,
      status: "passed",
      durationMs: 5,
      exitCode: 0,
      summaryLines: [],
      locations: [],
      logPath,
      diagnostic: null,
    };
  };

  const res1 = await verifyHeadDelivery({
    repoRoot,
    intent: "close_us",
    usId: "36",
    scopeFiles: [featurePath],
    executeCheck: mockCheck,
  });
  assert.strictEqual(res1.verified, true);
  assert.strictEqual(res1.cached, false);
  const initialRuns = checkRunCount;
  assert.ok(initialRuns > 0);

  // Second execution with a check runner that fails if called
  const res2 = await verifyHeadDelivery({
    repoRoot,
    intent: "close_us",
    usId: "36",
    scopeFiles: [featurePath],
    executeCheck: () => {
      throw new Error("Checks should not be re-executed on cached head");
    },
  });

  assert.strictEqual(res2.verified, true);
  assert.strictEqual(res2.status, "passed");
  assert.strictEqual(res2.cached, true);
  assert.strictEqual(res2.headSha, sha);
  assert.strictEqual(checkRunCount, initialRuns);
});

test("verifyHeadDelivery: cambio de HEAD - la evidencia previa no sirve para el nuevo HEAD", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const featurePath = "features/us37.feature";
  const sha1 = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US37\n  Scenario: Done\n    Given ok\n",
    "test[37]: first commit"
  );

  const mockPassedCheck = async ({ check, logPath }) => ({
    id: check.id,
    status: "passed",
    durationMs: 5,
    exitCode: 0,
    summaryLines: [],
    locations: [],
    logPath,
    diagnostic: null,
  });

  const res1 = await verifyHeadDelivery({
    repoRoot,
    intent: "close_us",
    usId: "37",
    scopeFiles: [featurePath],
    executeCheck: mockPassedCheck,
  });
  assert.strictEqual(res1.verified, true);
  assert.strictEqual(res1.headSha, sha1);

  // Create a new commit sha2
  const sha2 = await commitFile(
    repoRoot,
    "src/extra.txt",
    "extra content",
    "chore[37]: subsequent commit"
  );
  assert.notStrictEqual(sha2, sha1);

  // finalizeDelivery should block on sha2 because sha2 lacks Gate D evidence
  const mockCi = new MockCiProvider({
    [sha1]: { status: "passed" },
    [sha2]: { status: "passed" },
  });
  const finalizeRes = await finalizeInIsolatedRepo({
    repoRoot,
    intent: "close_us",
    usId: "37",
    scopeFiles: [featurePath],
    ciProvider: mockCi,
  });
  assert.strictEqual(finalizeRes.finalized, false);
  assert.strictEqual(finalizeRes.reason, "INVALID_HEAD_EVIDENCE");

  // verifyHeadDelivery on sha2 must not be cached: true from sha1
  let sha2Executed = false;
  const res2 = await verifyHeadDelivery({
    repoRoot,
    intent: "close_us",
    usId: "37",
    scopeFiles: [featurePath],
    executeCheck: async ({ check, logPath }) => {
      sha2Executed = true;
      return mockPassedCheck({ check, logPath });
    },
  });
  assert.strictEqual(res2.verified, true);
  assert.strictEqual(res2.cached, false);
  assert.strictEqual(res2.headSha, sha2);
  assert.strictEqual(sha2Executed, true);
});

test("verifyHeadDelivery: cambio de scope o política invalida la evidencia de HEAD", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const f1 = "features/us38a.feature";
  const f2 = "features/us38b.feature";
  await commitFile(repoRoot, f1, "Feature: US38A\n  Scenario: Done\n    Given ok\n", "test[38]: f1");
  const sha = await commitFile(repoRoot, f2, "Feature: US38B\n  Scenario: Done\n    Given ok\n", "test[38]: f2");

  const mockPassedCheck = async ({ check, logPath }) => ({
    id: check.id,
    status: "passed",
    durationMs: 5,
    exitCode: 0,
    summaryLines: [],
    locations: [],
    logPath,
    diagnostic: null,
  });

  // 1. Verify with scope [f1]
  const res1 = await verifyHeadDelivery({
    repoRoot,
    intent: "close_us",
    usId: "38",
    scopeFiles: [f1],
    executeCheck: mockPassedCheck,
  });
  assert.strictEqual(res1.verified, true);
  assert.strictEqual(res1.cached, false);

  // Calling again with same scope [f1] is cached
  const resCached = await verifyHeadDelivery({
    repoRoot,
    intent: "close_us",
    usId: "38",
    scopeFiles: [f1],
    executeCheck: () => {
      throw new Error("Should be cached");
    },
  });
  assert.strictEqual(resCached.cached, true);

  // 2. Changing scope to [f1, f2] invalidates cached evidence and re-runs
  let scopeChangeExecuted = false;
  const res2 = await verifyHeadDelivery({
    repoRoot,
    intent: "close_us",
    usId: "38",
    scopeFiles: [f1, f2],
    executeCheck: async ({ check, logPath }) => {
      scopeChangeExecuted = true;
      return mockPassedCheck({ check, logPath });
    },
  });
  assert.strictEqual(res2.verified, true);
  assert.strictEqual(res2.cached, false);
  assert.strictEqual(scopeChangeExecuted, true);

  // 3. Changing policy invalidates cached evidence
  const policyFile = path.join(repoRoot, ".delivery", "policy.v1.json");
  const rawPol = JSON.parse(await fs.readFile(policyFile, "utf8"));
  rawPol.limits.maxSignals = 30;
  await fs.writeFile(policyFile, JSON.stringify(rawPol, null, 2), "utf8");
  execFileSync("git", ["add", ".delivery/policy.v1.json"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "chore[38]: update policy limits"], { cwd: repoRoot });
  const newSha = headSha(repoRoot);

  let policyChangeExecuted = false;
  const res3 = await verifyHeadDelivery({
    repoRoot,
    intent: "close_us",
    usId: "38",
    scopeFiles: [f1, f2],
    executeCheck: async ({ check, logPath }) => {
      policyChangeExecuted = true;
      return mockPassedCheck({ check, logPath });
    },
  });
  assert.strictEqual(res3.verified, true);
  assert.strictEqual(res3.cached, false);
  assert.strictEqual(res3.headSha, newSha);
  assert.strictEqual(policyChangeExecuted, true);

  // Calling again on the new policy is now cached
  const res4 = await verifyHeadDelivery({
    repoRoot,
    intent: "close_us",
    usId: "38",
    scopeFiles: [f1, f2],
    executeCheck: () => {
      throw new Error("Should be cached on new policy");
    },
  });
  assert.strictEqual(res4.verified, true);
  assert.strictEqual(res4.cached, true);
  assert.strictEqual(res4.headSha, newSha);
});

test("verifyHeadDelivery: working tree incompatible o cambios conflictivos bloquean verify_head", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const featurePath = "features/us39.feature";
  await commitFile(
    repoRoot,
    featurePath,
    "Feature: US39\n  Scenario: Done\n    Given ok\n",
    "test[39]: clean commit"
  );

  // 1. Unstaged modification
  await fs.writeFile(path.join(repoRoot, featurePath), "Feature: US39\n  # dirty\n", "utf8");
  const resUnstaged = await verifyHeadDelivery({
    repoRoot,
    intent: "close_us",
    usId: "39",
    scopeFiles: [featurePath],
  });
  assert.strictEqual(resUnstaged.verified, false);
  assert.strictEqual(resUnstaged.status, "blocked");
  assert.ok(["DIRTY_WORKTREE", "UNSTAGED_CONFLICT"].includes(resUnstaged.reason));

  // Reset file
  execFileSync("git", ["checkout", "--", featurePath], { cwd: repoRoot });

  // 2. Staged uncommitted changes
  await fs.mkdir(path.join(repoRoot, "src"), { recursive: true });
  await fs.writeFile(path.join(repoRoot, "src/staged.txt"), "staged change", "utf8");
  execFileSync("git", ["add", "src/staged.txt"], { cwd: repoRoot });

  const resStaged = await verifyHeadDelivery({
    repoRoot,
    intent: "close_us",
    usId: "39",
    scopeFiles: [featurePath],
  });
  assert.strictEqual(resStaged.verified, false);
  assert.strictEqual(resStaged.status, "blocked");
  assert.ok(["DIRTY_WORKTREE", "STAGED_CHANGES_PRESENT"].includes(resStaged.reason));
});

test("verifyHeadDelivery: reutiliza evidencia si el commit ya fue preparado con close_us", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const featurePath = "features/us40.feature";
  const sha = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US40\n  Scenario: Done\n    Given ok\n",
    "test[40]: commit with prepared close_us"
  );

  // Simulate commit prepared with delivery_prepare(intent: "close_us")
  await attachEvidence({
    repoRoot,
    sha,
    gateId: "D",
    scopeFeatures: [featurePath],
    usId: "40",
    intent: "close_us",
  });

  // verifyHeadDelivery should reuse it as cached: true
  const res = await verifyHeadDelivery({
    repoRoot,
    intent: "close_us",
    usId: "40",
    scopeFiles: [featurePath],
    executeCheck: () => {
      throw new Error("Should not execute checks");
    },
  });

  assert.strictEqual(res.verified, true);
  assert.strictEqual(res.status, "passed");
  assert.strictEqual(res.cached, true);
  assert.strictEqual(res.headSha, sha);
});

test("finalizeDelivery (waitForCi): CI ya verde retorna inmediatamente con finalized: true, status: 'passed'", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const featurePath = "features/us41.feature";
  const sha = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US41\n  Scenario: Done\n    Given ok\n",
    "test[41]: complete scenario"
  );
  await attachEvidence({
    repoRoot,
    sha,
    gateId: "D",
    scopeFeatures: [featurePath],
    usId: "41",
    intent: "close_us",
  });

  const mockCi = new MockCiProvider({
    [sha]: { status: "passed" },
  });

  const startTime = Date.now();
  const res = await finalizeInIsolatedRepo({
    repoRoot,
    intent: "close_us",
    usId: "41",
    scopeFiles: [featurePath],
    ciProvider: mockCi,
    waitForCi: true,
    timeoutMs: 5000,
    pollIntervalMs: 50,
  });
  const duration = Date.now() - startTime;

  assert.strictEqual(res.finalized, true);
  assert.strictEqual(res.status, "passed");
  assert.strictEqual(res.headSha, sha);
  assert.ok(Array.isArray(res.ci));
  assert.strictEqual(res.ci[0].status, "passed");
  assert.ok(duration < 2000, "Debe retornar inmediatamente sin esperar timeout");
});

test("finalizeDelivery (waitForCi): CI pendiente que luego pasa resuelve a verde antes del timeout", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const featurePath = "features/us42.feature";
  const sha = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US42\n  Scenario: Done\n    Given ok\n",
    "test[42]: complete scenario"
  );
  await attachEvidence({
    repoRoot,
    sha,
    gateId: "D",
    scopeFeatures: [featurePath],
    usId: "42",
    intent: "close_us",
  });

  let calls = 0;
  const dynamicProvider = {
    async inspectCommit(targetSha) {
      calls++;
      return {
        schemaVersion: 1,
        sha: targetSha,
        workflow: { id: 1042, name: "CI" },
        status: calls >= 3 ? "passed" : "in_progress",
        failedJobs: [],
        failure: null,
        url: "https://github.com/example/runs/1042",
        retryable: false,
      };
    },
  };

  const res = await finalizeInIsolatedRepo({
    repoRoot,
    intent: "close_us",
    usId: "42",
    scopeFiles: [featurePath],
    ciProvider: dynamicProvider,
    waitForCi: true,
    timeoutMs: 5000,
    pollIntervalMs: 30,
  });

  assert.strictEqual(res.finalized, true);
  assert.strictEqual(res.status, "passed");
  assert.strictEqual(res.headSha, sha);
  assert.ok(calls >= 3, `Debe haber realizado polling (llamadas: ${calls})`);
  assert.strictEqual(res.ci[0].status, "passed");
});

test("finalizeDelivery (waitForCi): CI pendiente que luego falla corta de inmediato ante el fallo sin agotar timeout", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const featurePath = "features/us43.feature";
  const sha = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US43\n  Scenario: Done\n    Given ok\n",
    "test[43]: complete scenario"
  );
  await attachEvidence({
    repoRoot,
    sha,
    gateId: "D",
    scopeFeatures: [featurePath],
    usId: "43",
    intent: "close_us",
  });

  let calls = 0;
  const dynamicProvider = {
    async inspectCommit(targetSha) {
      calls++;
      if (calls < 2) {
        return {
          schemaVersion: 1,
          sha: targetSha,
          workflow: { id: 1043, name: "CI" },
          status: "in_progress",
          failedJobs: [],
          failure: null,
          url: "https://github.com/example/runs/1043",
          retryable: false,
        };
      }
      return {
        schemaVersion: 1,
        sha: targetSha,
        workflow: { id: 1043, name: "CI" },
        status: "failed",
        failedJobs: ["test"],
        failure: { message: "Test suite failure", excerpt: "Assertion failed" },
        url: "https://github.com/example/runs/1043",
        retryable: true,
      };
    },
  };

  const startTime = Date.now();
  const res = await finalizeInIsolatedRepo({
    repoRoot,
    intent: "close_us",
    usId: "43",
    scopeFiles: [featurePath],
    ciProvider: dynamicProvider,
    waitForCi: true,
    timeoutMs: 30000,
    pollIntervalMs: 30,
  });
  const elapsed = Date.now() - startTime;

  assert.strictEqual(res.finalized, false);
  assert.strictEqual(res.status, "blocked");
  assert.strictEqual(res.reason, "CI_NOT_GREEN");
  assert.strictEqual(res.ci.status, "failed");
  assert.ok(elapsed < 5000, `Debe cortar inmediatamente ante el fallo (tiempo: ${elapsed}ms)`);
});

test("finalizeDelivery (waitForCi): timeout con timeout corto y CI pendiente retorna CI_TIMEOUT", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const featurePath = "features/us44.feature";
  const sha = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US44\n  Scenario: Done\n    Given ok\n",
    "test[44]: complete scenario"
  );
  await attachEvidence({
    repoRoot,
    sha,
    gateId: "D",
    scopeFeatures: [featurePath],
    usId: "44",
    intent: "close_us",
  });

  const mockCi = new MockCiProvider({
    [sha]: { status: "in_progress" },
  });

  const res = await finalizeInIsolatedRepo({
    repoRoot,
    intent: "close_us",
    usId: "44",
    scopeFiles: [featurePath],
    ciProvider: mockCi,
    waitForCi: true,
    timeoutMs: 150,
    pollIntervalMs: 40,
  });

  assert.strictEqual(res.finalized, false);
  assert.strictEqual(res.status, "in_progress");
  assert.strictEqual(res.reason, "CI_TIMEOUT");
  assert.deepStrictEqual(res.pending, [sha]);
  assert.strictEqual(res.message, "Timed out waiting for CI completion");
});

test("finalizeDelivery (waitForCi): error de proveedor (provider_error) corta de inmediato", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const featurePath = "features/us45.feature";
  const sha = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US45\n  Scenario: Done\n    Given ok\n",
    "test[45]: complete scenario"
  );
  await attachEvidence({
    repoRoot,
    sha,
    gateId: "D",
    scopeFeatures: [featurePath],
    usId: "45",
    intent: "close_us",
  });

  const mockCi = new MockCiProvider({
    [sha]: {
      status: "provider_error",
      failure: { message: "GitHub service unavailable", excerpt: "503 Service Unavailable" },
    },
  });

  const startTime = Date.now();
  const res = await finalizeInIsolatedRepo({
    repoRoot,
    intent: "close_us",
    usId: "45",
    scopeFiles: [featurePath],
    ciProvider: mockCi,
    waitForCi: true,
    timeoutMs: 30000,
    pollIntervalMs: 50,
  });
  const elapsed = Date.now() - startTime;

  assert.strictEqual(res.finalized, false);
  assert.strictEqual(res.status, "blocked");
  assert.strictEqual(res.reason, "CI_NOT_GREEN");
  assert.strictEqual(res.ci.status, "provider_error");
  assert.ok(res.ci.failure.message.includes("GitHub service unavailable"));
  assert.ok(elapsed < 2000, `Debe cortar de inmediato ante provider_error (tiempo: ${elapsed}ms)`);
});

test("finalizeDelivery (waitForCi): compact diagnostic asegura resumen limpio sin logs gigantes", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const featurePath = "features/us46.feature";
  const sha = await commitFile(
    repoRoot,
    featurePath,
    "Feature: US46\n  Scenario: Done\n    Given ok\n",
    "test[46]: complete scenario"
  );
  await attachEvidence({
    repoRoot,
    sha,
    gateId: "D",
    scopeFeatures: [featurePath],
    usId: "46",
    intent: "close_us",
  });

  const hugeExcerpt = Array.from({ length: 500 }, (_, i) => `at internal/module.js:${i}:10 Error: Stack trace line ${i}`).join("\n");
  const mockCi = new MockCiProvider({
    [sha]: {
      status: "failed",
      workflow: { id: 1046, name: "CI Test Suite" },
      url: "https://github.com/example/runs/1046",
      failure: {
        message: "Check failed on tests",
        excerpt: hugeExcerpt,
      },
    },
  });

  const res = await finalizeInIsolatedRepo({
    repoRoot,
    intent: "close_us",
    usId: "46",
    scopeFiles: [featurePath],
    ciProvider: mockCi,
    waitForCi: true,
  });

  assert.strictEqual(res.finalized, false);
  assert.strictEqual(res.status, "blocked");
  assert.strictEqual(res.reason, "CI_NOT_GREEN");
  assert.ok(res.ci);
  // Verificar campos presentes en la respuesta compacta
  assert.strictEqual(res.ci.sha, sha);
  assert.strictEqual(res.ci.status, "failed");
  assert.deepStrictEqual(res.ci.workflow, { id: 1046, name: "CI Test Suite" });
  assert.strictEqual(res.ci.url, "https://github.com/example/runs/1046");
  assert.ok(res.ci.failure);
  assert.strictEqual(res.ci.failure.message, "Check failed on tests");
  // Excerpt debe ser compacto (máximo 6 líneas) y no contener las 500 líneas
  const excerptLines = res.ci.failure.excerpt.split("\n");
  assert.ok(excerptLines.length <= 6, `El extracto debe tener máximo 6 líneas (obtenido: ${excerptLines.length})`);
  // Tampoco debe volcar campos extra como failedJobs o schemaVersion en res.ci
  assert.strictEqual(res.ci.schemaVersion, undefined);
  assert.strictEqual(res.ci.failedJobs, undefined);
  // El tamaño serializado debe ser pequeño (< 1000 bytes)
  const jsonSize = Buffer.byteLength(JSON.stringify(res.ci), "utf8");
  assert.ok(jsonSize < 1000, `El JSON de CI debe ser compacto (< 1000 bytes, obtenido: ${jsonSize})`);
});
