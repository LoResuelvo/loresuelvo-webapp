import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useGoogleCoverageMap } from "./useGoogleCoverageMap";

interface TestWindow {
  google?: {
    maps?: {
      Map: unknown;
    };
  };
}

describe("useGoogleCoverageMap", () => {
  const mockZones = [
    { id: 6, name: "Comuna 6", boundary: { type: "admin_area_level_2", placeId: "place-comuna-6" } },
    { id: 14, name: "Comuna 14", boundary: { type: "admin_area_level_2", placeId: "place-comuna-14" } },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (window as unknown as TestWindow).google;
  });

  it("returns unavailable status when apiKey or mapId is missing", () => {
    const { result } = renderHook(() =>
      useGoogleCoverageMap({
        zones: mockZones,
        selectedZoneIds: [],
        apiKey: "",
        mapId: "",
      })
    );

    expect(result.current.status).toBe("unavailable");
  });

  it("dispatches onToggleZone when handlePolygonClick is invoked with matching placeId", () => {
    const onToggleZone = vi.fn();
    const { result } = renderHook(() =>
      useGoogleCoverageMap({
        zones: mockZones,
        selectedZoneIds: [],
        onToggleZone,
        apiKey: "mock-key",
        mapId: "mock-map-id",
      })
    );

    act(() => {
      result.current.handlePolygonClick("place-comuna-14");
    });

    expect(onToggleZone).toHaveBeenCalledWith(14);
  });

  it("does not call onToggleZone if placeId does not match any zone", () => {
    const onToggleZone = vi.fn();
    const { result } = renderHook(() =>
      useGoogleCoverageMap({
        zones: mockZones,
        selectedZoneIds: [],
        onToggleZone,
        apiKey: "mock-key",
        mapId: "mock-map-id",
      })
    );

    act(() => {
      result.current.handlePolygonClick("unknown-place-id");
    });

    expect(onToggleZone).not.toHaveBeenCalled();
  });

  it("initializes map and attaches listener to FeatureLayer when google maps is present", () => {
    const mockRemoveListener = vi.fn();
    const mockAddListener = vi.fn().mockReturnValue({ remove: mockRemoveListener });
    const mockFeatureLayer = {
      addListener: mockAddListener,
      style: undefined,
    };
    const mockMapInstance = {
      getFeatureLayer: vi.fn().mockReturnValue(mockFeatureLayer),
    };

    (window as unknown as TestWindow).google = {
      maps: {
        Map: vi.fn(function () {
          return mockMapInstance;
        }),
      },
    };

    const container = document.createElement("div");
    const onToggleZone = vi.fn();

    const { result, unmount } = renderHook(() => {
      const hook = useGoogleCoverageMap({
        zones: mockZones,
        selectedZoneIds: [6],
        onToggleZone,
        apiKey: "mock-key",
        mapId: "mock-map-id",
      });
      hook.containerRef.current = container;
      return hook;
    });

    expect(result.current.status).toBe("ready");
    expect(mockMapInstance.getFeatureLayer).toHaveBeenCalledWith("ADMINISTRATIVE_AREA_LEVEL_2");

    unmount();
    expect(mockRemoveListener).toHaveBeenCalledTimes(1);
  });
});
