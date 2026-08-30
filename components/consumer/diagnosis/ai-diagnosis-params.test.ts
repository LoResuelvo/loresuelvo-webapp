import { describe, it, expect } from "vitest";
import { parseAiDiagnosisParams } from "./ai-diagnosis-params";

describe("parseAiDiagnosisParams", () => {
  it("returns defaults when params are empty", () => {
    const params = new URLSearchParams();
    const result = parseAiDiagnosisParams(params);

    expect(result).toEqual({
      selectedId: null,
      isNewChat: false,
      isPending: false,
      isChatActive: false,
    });
  });

  it("identifies active chat when id is present", () => {
    const params = new URLSearchParams("id=42");
    const result = parseAiDiagnosisParams(params);

    expect(result).toEqual({
      selectedId: "42",
      isNewChat: false,
      isPending: false,
      isChatActive: true,
    });
  });

  it("identifies active chat when new is true", () => {
    const params = new URLSearchParams("new=true");
    const result = parseAiDiagnosisParams(params);

    expect(result).toEqual({
      selectedId: null,
      isNewChat: true,
      isPending: false,
      isChatActive: true,
    });
  });

  it("identifies active chat when pending is 1", () => {
    const params = new URLSearchParams("pending=1");
    const result = parseAiDiagnosisParams(params);

    expect(result).toEqual({
      selectedId: null,
      isNewChat: false,
      isPending: true,
      isChatActive: true,
    });
  });

  it("handles null or undefined input gracefully", () => {
    expect(parseAiDiagnosisParams(null)).toEqual({
      selectedId: null,
      isNewChat: false,
      isPending: false,
      isChatActive: false,
    });
  });
});
