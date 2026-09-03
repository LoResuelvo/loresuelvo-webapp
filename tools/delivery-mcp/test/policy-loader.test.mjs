import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadDeliveryPolicy } from "../lib/policy-loader.mjs";

test("loadDeliveryPolicy: loads the versioned policy and fingerprints its source", async () => {
  const policy = await loadDeliveryPolicy();
  assert.strictEqual(policy.version, 1);
  assert.match(policy.sourceHash, /^[a-f0-9]{64}$/);
  assert.deepStrictEqual(policy.gates.C.checkIds, [
    "lint",
    "typecheck_app",
    "typecheck_cucumber",
    "unit",
    "e2e_full",
  ]);
});

test("loadDeliveryPolicy: rejects commands outside the runner allowlist", async (t) => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-policy-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));
  const source = JSON.parse(await fs.readFile(".delivery/policy.v1.json", "utf8"));
  source.checkCatalog.unit.command = "bash";
  source.checkCatalog.unit.args = ["-c", "echo unsafe"];
  await fs.mkdir(path.join(repoRoot, ".delivery"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, ".delivery", "policy.v1.json"),
    JSON.stringify(source),
    "utf8"
  );

  await assert.rejects(
    loadDeliveryPolicy({ repoRoot }),
    /Unsafe delivery command rejected/
  );
});

test("loadDeliveryPolicy: path traversal en repoRoot o archivos de politica es rechazado", async () => {
  await assert.rejects(
    loadDeliveryPolicy({ repoRoot: "../../../etc" }),
    /outside repository|path traversal|ENOENT/
  );
});

