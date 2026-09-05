import { describe, expect, it, vi } from "vitest";
import { GetAvailableCoverageZonesUseCase } from "./get-available-coverage-zones";
import { CoverageZoneRepository } from "@/ports/provider/coverage-zone-repository";
import { CoverageZone } from "@/domain/provider/coverage-zone";

describe("GetAvailableCoverageZonesUseCase", () => {
  it("executes repository getAvailable and returns zones", async () => {
    const mockZones: CoverageZone[] = [
      { id: 6, name: "Comuna 6" },
      { id: 14, name: "Comuna 14" },
    ];

    const mockRepo: CoverageZoneRepository = {
      getAvailable: vi.fn().mockResolvedValue(mockZones),
    };

    const useCase = new GetAvailableCoverageZonesUseCase(mockRepo);
    const result = await useCase.execute();

    expect(mockRepo.getAvailable).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockZones);
  });

  it("propagates repository errors", async () => {
    const mockRepo: CoverageZoneRepository = {
      getAvailable: vi.fn().mockRejectedValue(new Error("Repository error")),
    };

    const useCase = new GetAvailableCoverageZonesUseCase(mockRepo);
    await expect(useCase.execute()).rejects.toThrow("Repository error");
  });
});
