import { describe, expect, it } from "vitest";
import { parseCalendarCallbackResult } from "./calendar-result";

describe("parseCalendarCallbackResult", () => {
  it("accepts only the success callback result", () => {
    expect(parseCalendarCallbackResult("success")).toBe("success");
  });

  it("accepts only the cancelled callback result", () => {
    expect(parseCalendarCallbackResult("cancelled")).toBe("cancelled");
  });

  it.each([undefined, "", "failed", "success, cancelled", ["success", "cancelled"]])(
    "rejects an unknown or repeated result: %s",
    (value) => {
      expect(parseCalendarCallbackResult(value)).toBeNull();
    },
  );
});
