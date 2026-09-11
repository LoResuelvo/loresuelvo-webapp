import { describe, expect, it } from "vitest";
import type { ApiCalendarAuthorization } from "@/infrastructure/api/types";
import { mapApiToCalendarAuthorization } from "./calendar-connection-mapper";

describe("mapApiToCalendarAuthorization", () => {
  it("maps the API payload to the camelCase domain contract", () => {
    const apiAuthorization: ApiCalendarAuthorization = {
      authorization_url: "https://accounts.google.com/o/oauth2/v2/auth",
      state: "opaque-state",
    };

    expect(mapApiToCalendarAuthorization(apiAuthorization)).toEqual({
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      state: "opaque-state",
    });
  });
});
