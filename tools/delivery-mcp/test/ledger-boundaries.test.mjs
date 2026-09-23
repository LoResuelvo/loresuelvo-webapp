import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import * as facade from "../lib/delivery-ledger.mjs";
import * as evidence from "../lib/ledger-evidence.mjs";
import * as repairs from "../lib/ledger-repairs.mjs";

test("la fachada conserva la identidad de los exports públicos extraídos", () => {
  const evidenceInternals = new Set([
    "assertCommitSha", "canonicalJson", "isJsonObject", "sortedUnique",
    "writeJsonAtomic", "recordPreparedEvidenceCore", "recordCommitEvidenceCore",
  ]);
  for (const [name, value] of Object.entries(evidence)) {
    if (!evidenceInternals.has(name)) assert.strictEqual(facade[name], value, name);
  }
  for (const [name, value] of Object.entries(repairs)) {
    assert.strictEqual(facade[name], value, name);
  }
  assert.equal(typeof facade.recordPreparedEvidence, "function");
  assert.equal(typeof facade.recordCommitEvidence, "function");
});

test("los módulos dueños no importan la fachada ni forman un ciclo", async () => {
  const files = ["ledger-evidence.mjs", "ledger-repairs.mjs"];
  for (const file of files) {
    const source = await fs.readFile(new URL(`../lib/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /from ["']\.\/delivery-ledger\.mjs["']/);
  }
  const evidenceSource = await fs.readFile(new URL("../lib/ledger-evidence.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(evidenceSource, /from ["']\.\/ledger-repairs\.mjs["']/);
});
