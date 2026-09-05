import { describe, expect, it } from "vitest";
import { CoverageZone } from "./coverage-zone";

describe("CoverageZone domain model", () => {
  it("creates a valid coverage zone with boundary", () => {
    const zone: CoverageZone = {
      id: 6,
      name: "Comuna 6",
      boundary: {
        type: "admin_area_level_2",
        placeId: "ChIJRd-test-comuna-6",
      },
    };

    expect(zone.id).toBe(6);
    expect(zone.name).toBe("Comuna 6");
    expect(zone.boundary?.placeId).toBe("ChIJRd-test-comuna-6");
  });

  it("creates a coverage zone without optional boundary", () => {
    const zone: CoverageZone = {
      id: 14,
      name: "Comuna 14",
    };

    expect(zone.id).toBe(14);
    expect(zone.name).toBe("Comuna 14");
    expect(zone.boundary).toBeUndefined();
  });
});
