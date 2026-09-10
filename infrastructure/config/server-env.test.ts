import { describe, expect, it } from "vitest";
import {
  getApiUrl,
  getAuth0RuntimeConfig,
  getGoogleMapsRuntimeConfig,
} from "./server-env";

describe("server environment", () => {
  it("uses the local API default only in development and test", () => {
    expect(getApiUrl({ APP_ENV: "development" })).toBe("http://localhost:8080");
    expect(getApiUrl({ APP_ENV: "test" })).toBe("http://localhost:8080");
    expect(() => getApiUrl({ APP_ENV: "production" })).toThrow(
      "API_URL is required"
    );
  });

  it("validates and normalizes API_URL", () => {
    expect(
      getApiUrl({ APP_ENV: "production", API_URL: "https://api.example.com/" })
    ).toBe("https://api.example.com");
    expect(() =>
      getApiUrl({ APP_ENV: "production", API_URL: "not-a-url" })
    ).toThrow();
  });

  it("requires a 32-byte hexadecimal Auth0 secret in production", () => {
    const baseEnv = {
      APP_ENV: "production",
      AUTH0_DOMAIN: "tenant.us.auth0.com",
      AUTH0_CLIENT_ID: "client-id",
      AUTH0_CLIENT_SECRET: "client-secret",
    };

    expect(() =>
      getAuth0RuntimeConfig({ ...baseEnv, AUTH0_SECRET: "too-short" })
    ).toThrow("64 hexadecimal characters");
    expect(
      getAuth0RuntimeConfig({ ...baseEnv, AUTH0_SECRET: "a".repeat(64) }).secret
    ).toHaveLength(64);
  });

  it("returns only trimmed, public Google Maps runtime values", () => {
    expect(
      getGoogleMapsRuntimeConfig({
        GOOGLE_MAPS_API_KEY: " key ",
        GOOGLE_MAPS_ID: " map-id ",
      })
    ).toEqual({ apiKey: "key", mapId: "map-id" });
  });
});
