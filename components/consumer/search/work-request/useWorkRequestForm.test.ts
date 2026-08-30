import { describe, expect, it } from "vitest";
import { parseWorkRequestError } from "./useWorkRequestForm";
import { t } from "@/infrastructure/i18n/translations";

describe("parseWorkRequestError", () => {
  it("maps duplicate errors correctly", () => {
    expect(parseWorkRequestError("Job request already exists for this provider")).toBe(
      t.consumerSearch.form.errorDuplicate
    );
    expect(parseWorkRequestError("Conversation already exists between users")).toBe(
      t.consumerSearch.form.errorDuplicate
    );
  });

  it("maps role error correctly", () => {
    expect(parseWorkRequestError("Only consumers can create job requests")).toBe(
      t.consumerSearch.form.errorRole
    );
  });

  it("maps provider missing error correctly", () => {
    expect(parseWorkRequestError("Provider does not exist")).toBe(
      t.consumerSearch.form.errorUnavailable
    );
  });

  it("maps missing field errors correctly", () => {
    expect(parseWorkRequestError("Title is required")).toBe(
      t.consumerSearch.form.errorMissing
    );
    expect(parseWorkRequestError("Provider id is required")).toBe(
      t.consumerSearch.form.errorMissing
    );
  });

  it("maps other errors to generic error", () => {
    expect(parseWorkRequestError("Internal database error")).toBe(
      t.consumerSearch.form.errorGeneric
    );
  });
});
