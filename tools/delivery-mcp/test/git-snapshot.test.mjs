import test from "node:test";
import assert from "node:assert/strict";
import {
  extractUsId,
  extractAllUsIds,
  parsePorcelainStatus,
} from "../lib/git-snapshot.mjs";

test("extractUsId: extrae identificador de US de mensajes de commit", () => {
  assert.strictEqual(extractUsId("feat[54]: add provider search"), "54");
  assert.strictEqual(extractUsId("fix[30.1]: resolve modal overlay click"), "30.1");
  assert.strictEqual(extractUsId("refactor[12.3.4]: extract hook"), "12.3.4");
  assert.strictEqual(extractUsId("docs: update readme"), null);
  assert.strictEqual(extractUsId(""), null);
  assert.strictEqual(extractUsId(null), null);
});

test("extractAllUsIds: detecta multiples US IDs o ninguno", () => {
  assert.deepStrictEqual(extractAllUsIds("feat[54]: new feature"), ["54"]);
  assert.deepStrictEqual(extractAllUsIds("feat[54]: conflict with [55]"), ["54", "55"]);
  assert.deepStrictEqual(extractAllUsIds("refactor: clean up code"), []);
});

test("parsePorcelainStatus: clasifica correctamente staged, unstaged y untracked", () => {
  const porcelain = Buffer.from(
    [
      "M  domain/user/user.ts",
      " M domain/order/order.ts",
      "MM domain/cart/cart.ts",
      "A  infrastructure/api/client.ts",
      "D  old-file.ts",
      "?? untracked-notes.txt",
    ].join("\n")
  );

  const { staged, unstaged, untracked } = parsePorcelainStatus(porcelain);

  assert.deepStrictEqual(
    staged.map((s) => s.file),
    [
      "domain/user/user.ts",
      "domain/cart/cart.ts",
      "infrastructure/api/client.ts",
      "old-file.ts",
    ]
  );

  assert.deepStrictEqual(
    unstaged.map((s) => s.file),
    ["domain/order/order.ts", "domain/cart/cart.ts"]
  );

  assert.deepStrictEqual(untracked, ["untracked-notes.txt"]);
});

test("parsePorcelainStatus: soporta formato NUL (-z) con espacios en nombres de archivo", () => {
  // Format: "M  path with spaces/file one.ts\0 M other file.ts\0?? untracked file.txt\0"
  const entries = [
    "M  path with spaces/file one.ts",
    " M other file.ts",
    "?? untracked file.txt",
  ];
  const buf = Buffer.concat(entries.map((e) => Buffer.concat([Buffer.from(e, "utf8"), Buffer.from([0])])));

  const { staged, unstaged, untracked } = parsePorcelainStatus(buf);

  assert.deepStrictEqual(
    staged.map((s) => s.file),
    ["path with spaces/file one.ts"]
  );
  assert.deepStrictEqual(
    unstaged.map((s) => s.file),
    ["other file.ts"]
  );
  assert.deepStrictEqual(untracked, ["untracked file.txt"]);
});
