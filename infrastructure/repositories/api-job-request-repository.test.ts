import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiJobRequestRepository } from "./api-job-request-repository";
import * as baseClient from "@/infrastructure/api/base-client";

vi.mock("@/infrastructure/api/base-client", () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe("ApiJobRequestRepository", () => {
  let repository: ApiJobRequestRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new ApiJobRequestRepository();
  });

  describe("accept", () => {
    it("calls POST /job-requests/{id}/accept", async () => {
      (baseClient.api.post as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await repository.accept(3);

      expect(baseClient.api.post).toHaveBeenCalledWith("/job-requests/3/accept", null);
    });

    it("sends correct method and endpoint", async () => {
      (baseClient.api.post as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await repository.accept(123);

      expect(baseClient.api.post).toHaveBeenCalledWith("/job-requests/123/accept", null);
    });
  });
});