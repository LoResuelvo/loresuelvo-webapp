import { CoverageZone } from "@/domain/provider/coverage-zone";
import type { GoogleMapsRuntimeConfig } from "@/infrastructure/config/public-runtime-config";
import { MapInstance, MapService } from "@/ports/maps/map-service";

interface MockWindow {
  __MOCK_MAPS_CONFIG__?: string;
  __MOCK_MAPS_ERROR__?: boolean;
}

export class MockMapAdapter implements MapService {
  async init(container: HTMLElement, config: GoogleMapsRuntimeConfig): Promise<MapInstance> {
    const win = typeof window !== "undefined" ? (window as unknown as MockWindow) : undefined;

    if (win?.__MOCK_MAPS_CONFIG__ === "missing" || (!config.apiKey && !config.mapId)) {
      throw new Error("MAP_UNAVAILABLE");
    }

    if (win?.__MOCK_MAPS_ERROR__ === true) {
      throw new Error("MAP_ERROR");
    }

    return new MockMapInstance();
  }
}

export class MockMapInstance implements MapInstance {
  private clickCallbacks: Array<(placeId: string) => void> = [];

  updateZones(_zones: CoverageZone[], _selectedZoneIds: number[]): void {
    // En el mock no se requiere manipulación de canvas/DOM de Google
  }

  onPolygonClick(callback: (placeId: string) => void): void {
    this.clickCallbacks.push(callback);
  }

  triggerPolygonClick(placeId: string): void {
    this.clickCallbacks.forEach((cb) => cb(placeId));
  }

  destroy(): void {
    this.clickCallbacks = [];
  }
}
