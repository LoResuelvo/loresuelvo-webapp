import { describe, expect, it, vi, beforeEach } from "vitest";
import { jobRequestsClient } from "@/lib/job-requests-client";
import * as baseClient from "@/lib/api/base-client";

vi.mock("@/lib/api/base-client", () => ({
  api: {
    post: vi.fn(),
  },
}));

describe("jobRequestsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("acceptJobRequest", () => {
    it("calls POST /job-requests/{id}/accept", async () => {
      (baseClient.api.post as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await jobRequestsClient.acceptJobRequest(3);

      expect(baseClient.api.post).toHaveBeenCalledWith("/job-requests/3/accept", null);
    });

    it("sends correct method and endpoint", async () => {
      (baseClient.api.post as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await jobRequestsClient.acceptJobRequest(123);

      expect(baseClient.api.post).toHaveBeenCalledWith("/job-requests/123/accept", null);
    });
  });
});