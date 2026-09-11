import { describe, expect, it, vi } from "vitest";
import { api } from "@/infrastructure/api/base-client";
import type { ApiCalendarAuthorization } from "@/infrastructure/api/types";
import { ApiCalendarConnectionRepository } from "./api-calendar-connection-repository";

vi.mock("@/infrastructure/api/base-client", () => ({
  api: {
    post: vi.fn(),
  },
}));

describe("ApiCalendarConnectionRepository", () => {
  it("starts authorization through the web endpoint and maps its response", async () => {
    const response: ApiCalendarAuthorization = {
      authorization_url: "https://accounts.google.com/o/oauth2/v2/auth",
      state: "opaque-state",
    };
    vi.mocked(api.post).mockResolvedValue(response);

    const result = await new ApiCalendarConnectionRepository().startAuthorization();

    expect(api.post).toHaveBeenCalledWith("/me/calendar-connection/authorizations", {});
    expect(result).toEqual({
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      state: "opaque-state",
    });
  });
});
