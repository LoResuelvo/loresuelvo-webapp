import { describe, expect, it } from "vitest";
import { getAppEnvironment, usesE2EAdapters } from "./runtime-env";

describe("runtime environment", () => {
  it("infers test only for the test runner", () => {
    expect(getAppEnvironment({ NODE_ENV: "test" })).toBe("test");
  });

  it("requires APP_ENV outside the test runner", () => {
    expect(() => getAppEnvironment({ NODE_ENV: "production" })).toThrow(
      "APP_ENV is required"
    );
  });

  it("rejects unknown APP_ENV values", () => {
    expect(() => getAppEnvironment({ APP_ENV: "produciton" })).toThrow();
  });

  it("keeps E2E adapters disabled in staging and production", () => {
    expect(usesE2EAdapters({ APP_ENV: "staging" })).toBe(false);
    expect(usesE2EAdapters({ APP_ENV: "production" })).toBe(false);
  });
});
