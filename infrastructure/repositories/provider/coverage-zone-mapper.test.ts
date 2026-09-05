import { describe, expect, it } from "vitest";
import { toDomainCoverageZone } from "./coverage-zone-mapper";
import { ApiCoverageZone } from "@/infrastructure/api/types";

describe("coverage-zone-mapper", () => {
  it("maps ApiCoverageZone with boundary to domain CoverageZone", () => {
    const apiZone: ApiCoverageZone = {
      id: 6,
      name: "Comuna 6",
      boundary: {
        type: "admin_area_level_2",
        place_id: "ChIJRd-test-comuna-6",
      },
    };

    const domain = toDomainCoverageZone(apiZone);

    expect(domain.id).toBe(6);
    expect(domain.name).toBe("Comuna 6");
    expect(domain.boundary).toEqual({
      type: "admin_area_level_2",
      placeId: "ChIJRd-test-comuna-6",
    });
  });

  it("maps ApiCoverageZone without boundary to domain CoverageZone", () => {
    const apiZone: ApiCoverageZone = {
      id: 14,
      name: "Comuna 14",
    };

    const domain = toDomainCoverageZone(apiZone);

    expect(domain.id).toBe(14);
    expect(domain.name).toBe("Comuna 14");
    expect(domain.boundary).toBeUndefined();
  });
});
