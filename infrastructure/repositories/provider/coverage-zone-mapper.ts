import { ApiCoverageZone } from "@/infrastructure/api/types";
import { CoverageZone } from "@/domain/provider/coverage-zone";

export function toDomainCoverageZone(apiZone: ApiCoverageZone): CoverageZone {
  return {
    id: apiZone.id,
    name: apiZone.name,
    boundary: apiZone.boundary
      ? {
          type: apiZone.boundary.type,
          placeId: apiZone.boundary.place_id,
        }
      : undefined,
  };
}
