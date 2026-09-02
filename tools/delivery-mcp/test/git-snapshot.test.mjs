import test from "node:test";
import assert from "node:assert/strict";
import { extractUsId, parsePorcelainStatus } from "../lib/git-snapshot.mjs";

test("extractUsId: extrae identificador de US de mensajes de commit", () => {
  assert.strictEqual(extractUsId("feat[54]: add provider search"), "54");
  assert.strictEqual(extractUsId("fix[30.1]: resolve modal overlay click"), "30.1");
  assert.strictEqual(extractUsId("refactor[12.3.4]: extract hook"), "12.3.4");
  assert.strictEqual(extractUsId("docs: update readme"), null);
  assert.strictEqual(extractUsId(""), null);
  assert.strictEqual(extractUsId(null), null);
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
