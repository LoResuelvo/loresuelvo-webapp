import type {
  WorkOrderReviewReportCategory,
  WorkOrderReviewReportInput,
} from "./types";

export type WorkOrderReviewReportValidationError =
  | "invalid_input"
  | "category_required"
  | "invalid_category"
  | "invalid_explanation"
  | "explanation_contains_nul"
  | "explanation_too_long";

export type WorkOrderReviewReportValidationResult =
  | { valid: true; input: WorkOrderReviewReportInput }
  | { valid: false; error: WorkOrderReviewReportValidationError };

const reportCategories: readonly WorkOrderReviewReportCategory[] = [
  "abusive_language",
  "personal_data",
  "spam_advertising",
  "unrelated_content",
];

const goWhitespace = new Set([
  "\u0009",
  "\u000a",
  "\u000b",
  "\u000c",
  "\u000d",
  "\u0020",
  "\u0085",
  "\u00a0",
  "\u1680",
  "\u2000",
  "\u2001",
  "\u2002",
  "\u2003",
  "\u2004",
  "\u2005",
  "\u2006",
  "\u2007",
  "\u2008",
  "\u2009",
  "\u200a",
  "\u2028",
  "\u2029",
  "\u202f",
  "\u205f",
  "\u3000",
]);

function trimGoWhitespace(value: string): string {
  const codePoints = Array.from(value);
  let start = 0;
  let end = codePoints.length;

  while (start < end && goWhitespace.has(codePoints[start])) start += 1;
  while (end > start && goWhitespace.has(codePoints[end - 1])) end -= 1;

  return codePoints.slice(start, end).join("");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReportCategory(value: unknown): value is WorkOrderReviewReportCategory {
  return typeof value === "string" && reportCategories.includes(value as WorkOrderReviewReportCategory);
}

export function validateWorkOrderReviewReportInput(
  input: unknown
): WorkOrderReviewReportValidationResult {
  if (!isRecord(input)) return { valid: false, error: "invalid_input" };

  const category = input.category;
  if (category === undefined || category === "") {
    return { valid: false, error: "category_required" };
  }
  if (!isReportCategory(category)) {
    return { valid: false, error: "invalid_category" };
  }

  const rawExplanation = input.explanation;
  if (rawExplanation === undefined) {
    return { valid: true, input: { category } };
  }
  if (typeof rawExplanation !== "string") {
    return { valid: false, error: "invalid_explanation" };
  }
  if (rawExplanation.includes("\u0000")) {
    return { valid: false, error: "explanation_contains_nul" };
  }

  const explanation = trimGoWhitespace(rawExplanation);
  if (Array.from(explanation).length > 500) {
    return { valid: false, error: "explanation_too_long" };
  }
  if (explanation === "") {
    return { valid: true, input: { category } };
  }

  return { valid: true, input: { category, explanation } };
}

export class WorkOrderReviewReportValidationException extends Error {
  readonly validationError: WorkOrderReviewReportValidationError;

  constructor(validationError: WorkOrderReviewReportValidationError) {
    super("Invalid review report input");
    this.name = "WorkOrderReviewReportValidationException";
    this.validationError = validationError;
  }
}
