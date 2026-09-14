import { CoverageZone } from "@/domain/provider/coverage-zone";
import type { GoogleMapsRuntimeConfig } from "@/infrastructure/config/public-runtime-config";

export interface MapInstance {
  updateZones(zones: CoverageZone[], selectedZoneIds: number[]): void;
  onPolygonClick(callback: (placeId: string) => void): void;
  destroy(): void;
}

export type MapServiceStatus = "idle" | "ready" | "unavailable" | "error";

export interface MapService {
  init(container: HTMLElement, config: GoogleMapsRuntimeConfig): Promise<MapInstance>;
}
