import { CoverageZone } from "@/domain/provider/coverage-zone";

export interface CoverageZoneRepository {
  getAvailable(): Promise<CoverageZone[]>;
}
