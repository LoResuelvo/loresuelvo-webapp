import { describe, expect, it } from "vitest";
import { validateProfileForm, validateProfilePhoto } from "./validation";

describe("validateProfileForm", () => {
  it("validates a complete consumer form successfully", () => {
    const { isValid, errors } = validateProfileForm("Andrés", "Pérez", "consumer");
    expect(isValid).toBe(true);
    expect(errors).toEqual({});
  });

  it("fails if first name or last name is missing", () => {
    const { isValid, errors } = validateProfileForm("", "  ", "consumer");
    expect(isValid).toBe(false);
    expect(errors.firstName).toBeDefined();
    expect(errors.lastName).toBeDefined();
  });

  it("validates a provider form with category and photo successfully", () => {
    const { isValid, errors } = validateProfileForm(
      "Juan",
      "Pérez",
      "provider",
      "1",
      1000,
      "avatar.png",
      "image/png"
    );
    expect(isValid).toBe(true);
    expect(errors).toEqual({});
  });

  it("fails if a provider does not select a category", () => {
    const { isValid, errors } = validateProfileForm(
      "Juan",
      "Pérez",
      "provider",
      "",
      1000,
      "avatar.png",
      "image/png"
    );
    expect(isValid).toBe(false);
    expect(errors.categoryId).toBeDefined();
  });

  it("fails if a provider does not have a profile photo", () => {
    const { isValid, errors } = validateProfileForm(
      "Juan",
      "Pérez",
      "provider",
      "1"
    );
    expect(isValid).toBe(false);
    expect(errors.profilePhoto).toBeDefined();
  });

  it("fails if the provider profile photo is too large", () => {
    const { isValid, errors } = validateProfileForm(
      "Juan",
      "Pérez",
      "provider",
      "1",
      10 * 1024 * 1024,
      "avatar.png",
      "image/png"
    );
    expect(isValid).toBe(false);
    expect(errors.profilePhoto).toBeDefined();
  });

  it("fails if the provider profile photo has an invalid format", () => {
    const { isValid, errors } = validateProfileForm(
      "Juan",
      "Pérez",
      "provider",
      "1",
      1000,
      "document.pdf",
      "application/pdf"
    );
    expect(isValid).toBe(false);
    expect(errors.profilePhoto).toBeDefined();
  });
});

describe("validateProfilePhoto", () => {
  it("returns null if no file is provided", () => {
    expect(validateProfilePhoto(null)).toBeNull();
  });

  it("validates a photo with valid size and mime type successfully", () => {
    expect(validateProfilePhoto({ size: 1000, type: "image/jpeg" })).toBeNull();
  });

  it("returns error if size exceeds the limit", () => {
    const error = validateProfilePhoto({ size: 6 * 1024 * 1024, type: "image/png" });
    expect(error).toBeDefined();
  });

  it("returns error if MIME type is invalid", () => {
    const error = validateProfilePhoto({ size: 1000, type: "image/gif" });
    expect(error).toBeDefined();
  });
});
