import { describe, expect, it, vi } from "vitest";
import type { CalendarConnectionRepository } from "@/ports/calendar/calendar-connection-repository";
import { startCalendarAuthorization } from "./start-calendar-authorization";

describe("startCalendarAuthorization", () => {
  it("returns only the authorization URL from the repository response", async () => {
    const repository: CalendarConnectionRepository = {
      startAuthorization: vi.fn().mockResolvedValue({
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        state: "opaque-state",
      }),
    };

    await expect(startCalendarAuthorization(repository)).resolves.toEqual({
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    });
  });

  it("propagates repository errors", async () => {
    const repository: CalendarConnectionRepository = {
      startAuthorization: vi.fn().mockRejectedValue(new Error("Calendar API unavailable")),
    };

    await expect(startCalendarAuthorization(repository)).rejects.toThrow(
      "Calendar API unavailable",
    );
  });
});
