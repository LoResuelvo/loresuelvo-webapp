import { describe, expect, it } from "vitest";
import { validateWorkOrderReviewReportInput } from "./review-report-validation";

describe("validateWorkOrderReviewReportInput", () => {
  it("requires a supported report category", () => {
    expect(validateWorkOrderReviewReportInput({ explanation: "Contexto" })).toEqual({
      valid: false,
      error: "category_required",
    });
    expect(
      validateWorkOrderReviewReportInput({ category: "not-a-category" })
    ).toEqual({ valid: false, error: "invalid_category" });
  });

  it("omits an explanation that contains only Go-trimmed whitespace", () => {
    expect(
      validateWorkOrderReviewReportInput({
        category: "spam_advertising",
        explanation: " \t\n\u0085\u00a0\u3000 ",
      })
    ).toEqual({ valid: true, input: { category: "spam_advertising" } });
  });

  it("keeps U+FEFF because Go strings.TrimSpace does not trim it", () => {
    expect(
      validateWorkOrderReviewReportInput({
        category: "abusive_language",
        explanation: "\uFEFF",
      })
    ).toEqual({
      valid: true,
      input: { category: "abusive_language", explanation: "\uFEFF" },
    });
  });

  it("allows at most 500 Unicode code points after Go whitespace trimming", () => {
    const exactly500 = "😀".repeat(500);
    expect(
      validateWorkOrderReviewReportInput({
        category: "personal_data",
        explanation: ` \u0085${exactly500}\u3000 `,
      })
    ).toEqual({
      valid: true,
      input: { category: "personal_data", explanation: exactly500 },
    });
    expect(
      validateWorkOrderReviewReportInput({
        category: "personal_data",
        explanation: "😀".repeat(501),
      })
    ).toEqual({ valid: false, error: "explanation_too_long" });
  });

  it("rejects NUL and non-string explanations", () => {
    expect(
      validateWorkOrderReviewReportInput({
        category: "unrelated_content",
        explanation: "texto\u0000inválido",
      })
    ).toEqual({ valid: false, error: "explanation_contains_nul" });
    expect(
      validateWorkOrderReviewReportInput({
        category: "unrelated_content",
        explanation: 10,
      })
    ).toEqual({ valid: false, error: "invalid_explanation" });
  });

  it("rejects non-object and null input", () => {
    expect(validateWorkOrderReviewReportInput(null)).toEqual({
      valid: false,
      error: "invalid_input",
    });
    expect(validateWorkOrderReviewReportInput("spam_advertising")).toEqual({
      valid: false,
      error: "invalid_input",
    });
  });
});
