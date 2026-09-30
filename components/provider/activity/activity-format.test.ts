import { describe, expect, it } from "vitest";
import { activityMoney } from "./activity-format";

describe("activity money", () => {
  it.each([[Number.MAX_SAFE_INTEGER, "90.071.992.547.409,91"], [-Number.MAX_SAFE_INTEGER, "-"], [-1, "-"], [-99, "-"]])("preserves safe integer cents and their sign", (cents, expected) => {
    expect(activityMoney(cents)).toContain(expected);
    if (cents === -Number.MAX_SAFE_INTEGER) expect(activityMoney(cents)).toContain("90.071.992.547.409,91");
    if (cents === -1) expect(activityMoney(cents)).toContain("0,01");
    if (cents === -99) expect(activityMoney(cents)).toContain("0,99");
  });
  it("distinguishes missing values from zero", () => {
    expect(activityMoney(null)).toBe("No disponible");
    expect(activityMoney(0)).toContain("0,00");
  });
});
