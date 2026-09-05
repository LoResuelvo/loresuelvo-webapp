import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCoverageZonesAction } from "./coverage-zones";
import { GetAvailableCoverageZonesUseCase } from "@/application/provider/get-available-coverage-zones";

describe("getCoverageZonesAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success true and coverage zones when execution succeeds", async () => {
    const mockZones = [
      { id: 6, name: "Comuna 6" },
      { id: 14, name: "Comuna 14" },
    ];

    vi.spyOn(GetAvailableCoverageZonesUseCase.prototype, "execute").mockResolvedValue(mockZones);

    const result = await getCoverageZonesAction();

    expect(result).toEqual({
      success: true,
      data: mockZones,
    });
  });

  it("returns success false and error message when execution fails", async () => {
    vi.spyOn(GetAvailableCoverageZonesUseCase.prototype, "execute").mockRejectedValue(
      new Error("Service unavailable")
    );

    const result = await getCoverageZonesAction();

    expect(result).toEqual({
      success: false,
      error: "Service unavailable",
    });
  });
});
