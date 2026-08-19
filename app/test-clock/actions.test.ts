import { describe, expect, it, vi, beforeEach } from "vitest";
import { setApiClockAction, clearApiClockAction } from "./actions";
import * as baseClient from "@/infrastructure/api/base-client";
import { ApiClientError } from "@/infrastructure/api/base-client";

vi.mock("@/infrastructure/api/base-client", () => ({
  api: {
    post: vi.fn(),
  },
  ApiClientError: class extends Error {
    constructor(public status: number, public statusText: string, message?: string) {
      super(message || `API Error: ${status}`);
      this.name = "ApiClientError";
    }
  },
}));

describe("test-clock actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("setApiClockAction", () => {
    it("calls POST /test/clock with now ISO string and returns ok: true", async () => {
      vi.mocked(baseClient.api.post).mockResolvedValue({});

      const result = await setApiClockAction("2026-09-04T12:00:00Z");

      expect(baseClient.api.post).toHaveBeenCalledWith("/test/clock", {
        now: "2026-09-04T12:00:00Z",
      });
      expect(result).toEqual({ ok: true });
    });

    it("returns ok: false with status and message on ApiClientError", async () => {
      vi.mocked(baseClient.api.post).mockRejectedValue(
        new ApiClientError(400, "Bad Request", "invalid datetime format")
      );

      const result = await setApiClockAction("invalid-date");

      expect(result).toEqual({
        ok: false,
        status: 400,
        message: "invalid datetime format",
      });
    });
  });

  describe("clearApiClockAction", () => {
    it("calls POST /test/clear and returns ok: true", async () => {
      vi.mocked(baseClient.api.post).mockResolvedValue({});

      const result = await clearApiClockAction();

      expect(baseClient.api.post).toHaveBeenCalledWith("/test/clear", {});
      expect(result).toEqual({ ok: true });
    });

    it("returns ok: false with status and message on ApiClientError", async () => {
      vi.mocked(baseClient.api.post).mockRejectedValue(
        new ApiClientError(500, "Internal Server Error", "server error")
      );

      const result = await clearApiClockAction();

      expect(result).toEqual({
        ok: false,
        status: 500,
        message: "server error",
      });
    });
  });
});
