import { describe, expect, it, vi } from "vitest";
import { startCalendarAuthorization } from "@/application/calendar/start-calendar-authorization";
import { startCalendarAuthorizationAction } from "./calendar-actions";

vi.mock("@/application/calendar/start-calendar-authorization", () => ({
  startCalendarAuthorization: vi.fn(),
}));

describe("startCalendarAuthorizationAction", () => {
  it("returns the public authorization URL without exposing state", async () => {
    vi.mocked(startCalendarAuthorization).mockResolvedValue({
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    });

    await expect(startCalendarAuthorizationAction()).resolves.toEqual({
      ok: true,
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    });
  });

  it("returns a safe generic error when starting authorization fails", async () => {
    vi.mocked(startCalendarAuthorization).mockRejectedValue(
      new Error("Internal calendar provider failure"),
    );

    await expect(startCalendarAuthorizationAction()).resolves.toEqual({
      ok: false,
      error: "No pudimos iniciar la vinculación con Google Calendar. Intentá nuevamente.",
    });
  });
});
