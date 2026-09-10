import { describe, expect, it } from "vitest";
import { getPublicMediaBaseUrl } from "./build-env";

describe("getPublicMediaBaseUrl", () => {
  it("returns null when the optional build variable is absent", () => {
    expect(getPublicMediaBaseUrl({})).toBeNull();
  });

  it("returns a validated HTTPS URL", () => {
    expect(
      getPublicMediaBaseUrl({
        PUBLIC_MEDIA_BASE_URL: "https://media.example.com/assets",
      })?.hostname
    ).toBe("media.example.com");
  });

  it("rejects insecure URLs", () => {
    expect(() =>
      getPublicMediaBaseUrl({
        PUBLIC_MEDIA_BASE_URL: "http://media.example.com",
      })
    ).toThrow("must use HTTPS");
  });
});
