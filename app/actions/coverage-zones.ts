"use server";

import { ApiCoverageZoneRepository } from "@/infrastructure/repositories/provider/api-coverage-zone-repository";
import { GetAvailableCoverageZonesUseCase } from "@/application/provider/get-available-coverage-zones";
import { CoverageZone } from "@/domain/provider/coverage-zone";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getCoverageZonesAction(): Promise<ActionResult<CoverageZone[]>> {
  try {
    const repository = new ApiCoverageZoneRepository();
    const useCase = new GetAvailableCoverageZonesUseCase(repository);
    const data = await useCase.execute();
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener zonas de cobertura";
    return { success: false, error: message };
  }
}
