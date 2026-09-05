import { beforeEach, describe, expect, it, vi } from "vitest";
import * as baseClient from "@/infrastructure/api/base-client";
import { ApiCoverageZoneRepository } from "./api-coverage-zone-repository";

vi.mock("@/infrastructure/api/base-client", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("ApiCoverageZoneRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches available coverage zones and maps to domain", async () => {
    vi.mocked(baseClient.api.get).mockResolvedValue([
      {
        id: 6,
        name: "Comuna 6",
        boundary: {
          type: "admin_area_level_2",
          place_id: "ChIJRd-test-comuna-6",
        },
      },
      {
        id: 14,
        name: "Comuna 14",
      },
    ]);

    const repository = new ApiCoverageZoneRepository();
    const result = await repository.getAvailable();

    expect(baseClient.api.get).toHaveBeenCalledWith("/coverage-zones");
    expect(result).toEqual([
      {
        id: 6,
        name: "Comuna 6",
        boundary: {
          type: "admin_area_level_2",
          placeId: "ChIJRd-test-comuna-6",
        },
      },
      {
        id: 14,
        name: "Comuna 14",
        boundary: undefined,
      },
    ]);
  });

  it("returns empty array when api response is empty", async () => {
    vi.mocked(baseClient.api.get).mockResolvedValue([]);

    const repository = new ApiCoverageZoneRepository();
    const result = await repository.getAvailable();

    expect(result).toEqual([]);
  });

  it("propagates error when api call fails", async () => {
    vi.mocked(baseClient.api.get).mockRejectedValue(new Error("API failure"));

    const repository = new ApiCoverageZoneRepository();
    await expect(repository.getAvailable()).rejects.toThrow("API failure");
  });
});
