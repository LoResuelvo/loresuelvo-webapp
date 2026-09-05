import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useCoverageZones } from "./useCoverageZones";
import * as coverageActions from "@/app/actions/coverage-zones";

vi.mock("@/app/actions/coverage-zones", () => ({
  getCoverageZonesAction: vi.fn(),
}));

describe("useCoverageZones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not load zones if role is consumer", () => {
    const { result } = renderHook(() => useCoverageZones("consumer"));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.zones).toEqual([]);
    expect(coverageActions.getCoverageZonesAction).not.toHaveBeenCalled();
  });

  it("loads zones successfully when role is provider", async () => {
    const mockZones = [
      { id: 6, name: "Comuna 6" },
      { id: 14, name: "Comuna 14" },
    ];
    vi.mocked(coverageActions.getCoverageZonesAction).mockResolvedValue({
      success: true,
      data: mockZones,
    });

    const { result } = renderHook(() => useCoverageZones("provider"));

    expect(result.current.isLoading).toBe(true);

    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
    expect(result.current.zones).toEqual(mockZones);
    expect(result.current.error).toBeNull();
  });

  it("sets error when getCoverageZonesAction returns failure", async () => {
    vi.mocked(coverageActions.getCoverageZonesAction).mockResolvedValue({
      success: false,
      error: "Error del servidor",
    });

    const { result } = renderHook(() => useCoverageZones("provider"));

    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe("Error del servidor");
  });

  it("toggles zone selection", () => {
    const { result } = renderHook(() => useCoverageZones("consumer"));

    act(() => {
      result.current.toggleZone(6);
    });
    expect(result.current.selectedZoneIds).toEqual([6]);

    act(() => {
      result.current.toggleZone(14);
    });
    expect(result.current.selectedZoneIds).toEqual([6, 14]);

    act(() => {
      result.current.toggleZone(6);
    });
    expect(result.current.selectedZoneIds).toEqual([14]);
  });
});
