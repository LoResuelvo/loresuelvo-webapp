import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadDeliveryPolicy } from "../lib/policy-loader.mjs";

test("loadDeliveryPolicy: loads the versioned policy and fingerprints its source", async () => {
  const policy = await loadDeliveryPolicy();
  assert.strictEqual(policy.version, 1);
  assert.strictEqual(policy.ci.maxInFlightCommits, 4);
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
  await fs.mkdir(path.join(repoRoot, ".delivery", "schemas"), { recursive: true });
  await fs.copyFile(
    ".delivery/schemas/policy.schema.json",
    path.join(repoRoot, ".delivery", "schemas", "policy.schema.json")
  );
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

test("loadDeliveryPolicy: rejects an invalid CI in-flight window", async (t) => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-policy-ci-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));
  const source = JSON.parse(await fs.readFile(".delivery/policy.v1.json", "utf8"));
  source.ci.maxInFlightCommits = 0;
  await fs.mkdir(path.join(repoRoot, ".delivery", "schemas"), { recursive: true });
  await fs.copyFile(
    ".delivery/schemas/policy.schema.json",
    path.join(repoRoot, ".delivery", "schemas", "policy.schema.json")
  );
  await fs.writeFile(
    path.join(repoRoot, ".delivery", "policy.v1.json"),
    JSON.stringify(source),
    "utf8"
  );

  await assert.rejects(loadDeliveryPolicy({ repoRoot }), /ci|maxInFlightCommits/);
});

test("loadDeliveryPolicy: rechaza propiedades fuera del contrato JSON Schema", async (t) => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-policy-schema-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));
  const source = JSON.parse(await fs.readFile(".delivery/policy.v1.json", "utf8"));
  source.unexpected = true;
  await fs.mkdir(path.join(repoRoot, ".delivery", "schemas"), { recursive: true });
  await fs.copyFile(
    ".delivery/schemas/policy.schema.json",
    path.join(repoRoot, ".delivery", "schemas", "policy.schema.json")
  );
  await fs.writeFile(
    path.join(repoRoot, ".delivery", "policy.v1.json"),
    JSON.stringify(source),
    "utf8"
  );

  await assert.rejects(loadDeliveryPolicy({ repoRoot }), /unexpected property 'unexpected'/);
});

test("loadDeliveryPolicy: path traversal en repoRoot o archivos de politica es rechazado", async () => {
  await assert.rejects(
    loadDeliveryPolicy({ repoRoot: "../../../etc" }),
    /outside repository|path traversal|ENOENT/
  );
});

test("loadDeliveryPolicy: rechaza reglas de clasificacion con IDs duplicados o patrones regex invalidos", async (t) => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-policy-rules-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));
  const source = JSON.parse(await fs.readFile(".delivery/policy.v1.json", "utf8"));
  source.classification.rules.push({ ...source.classification.rules[0] });
  await fs.mkdir(path.join(repoRoot, ".delivery", "schemas"), { recursive: true });
  await fs.copyFile(
    ".delivery/schemas/policy.schema.json",
    path.join(repoRoot, ".delivery", "schemas", "policy.schema.json")
  );
  await fs.writeFile(
    path.join(repoRoot, ".delivery", "policy.v1.json"),
    JSON.stringify(source),
    "utf8"
  );

  await assert.rejects(loadDeliveryPolicy({ repoRoot }), /duplicate classification rule/);

  source.classification.rules.pop();
  source.classification.rules[0].match.patterns = ["(?[" ];
  await fs.writeFile(
    path.join(repoRoot, ".delivery", "policy.v1.json"),
    JSON.stringify(source),
    "utf8"
  );
  await assert.rejects(loadDeliveryPolicy({ repoRoot }), /malformed classification pattern/);
});
