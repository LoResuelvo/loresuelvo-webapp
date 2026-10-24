import { describe, expect, it } from "vitest";
import { parseMercadoPagoCallbackResult } from "./mercado-pago-result";

describe("parseMercadoPagoCallbackResult", () => {
  it.each(["success", "cancelled"] as const)("accepts %s", (value) => {
    expect(parseMercadoPagoCallbackResult(value)).toBe(value);
  });

  it.each([undefined, null, "failed", ["success"], ["cancelled", "success"]])(
    "rejects invalid result %j",
    (value) => {
      expect(parseMercadoPagoCallbackResult(value)).toBeNull();
    },
  );
});
