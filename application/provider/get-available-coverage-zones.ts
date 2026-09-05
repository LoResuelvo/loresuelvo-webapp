import { CoverageZone } from "@/domain/provider/coverage-zone";
import { CoverageZoneRepository } from "@/ports/provider/coverage-zone-repository";

export class GetAvailableCoverageZonesUseCase {
  constructor(private readonly coverageZoneRepository: CoverageZoneRepository) {}

  async execute(): Promise<CoverageZone[]> {
    return this.coverageZoneRepository.getAvailable();
  }
}
