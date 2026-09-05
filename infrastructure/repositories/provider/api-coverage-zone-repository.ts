import { api } from "@/infrastructure/api/base-client";
import { CoverageZone } from "@/domain/provider/coverage-zone";
import { CoverageZoneRepository } from "@/ports/provider/coverage-zone-repository";
import { ApiCoverageZone } from "@/infrastructure/api/types";
import { toDomainCoverageZone } from "./coverage-zone-mapper";

export class ApiCoverageZoneRepository implements CoverageZoneRepository {
  async getAvailable(): Promise<CoverageZone[]> {
    const response = await api.get<ApiCoverageZone[]>("/coverage-zones");
    if (!Array.isArray(response)) {
      return [];
    }
    return response.map(toDomainCoverageZone);
  }
}
