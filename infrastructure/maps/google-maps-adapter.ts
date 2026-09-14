import { Loader } from "@googlemaps/js-api-loader";
import { CoverageZone } from "@/domain/provider/coverage-zone";
import type { GoogleMapsRuntimeConfig } from "@/infrastructure/config/public-runtime-config";
import { MapInstance, MapService } from "@/ports/maps/map-service";

interface GoogleFeatureEvent {
  feature?: {
    placeId?: string;
  };
}

interface GoogleFeatureLayer {
  addListener?: (event: string, handler: (e: GoogleFeatureEvent) => void) => { remove?: () => void };
  style?: (options: { feature: { placeId: string } }) => Record<string, unknown>;
}

interface GoogleMap {
  getFeatureLayer?: (layerId: string) => GoogleFeatureLayer | undefined;
}

interface MapsWindow {
  google?: {
    maps?: {
      Map: new (
        container: HTMLElement,
        options: { mapId?: string; center?: { lat: number; lng: number }; zoom?: number }
      ) => GoogleMap;
    };
  };
}

export class GoogleMapsAdapter implements MapService {
  async init(container: HTMLElement, config: GoogleMapsRuntimeConfig): Promise<MapInstance> {
    if (!config.apiKey || !config.mapId) {
      throw new Error("MAP_UNAVAILABLE");
    }

    const win = typeof window !== "undefined" ? (window as unknown as MapsWindow) : undefined;
    let MapConstructor = win?.google?.maps?.Map;

    if (!MapConstructor) {
      const loader = new Loader({
        apiKey: config.apiKey,
        version: "weekly",
        libraries: ["maps"],
      });
      await loader.load();
      MapConstructor = (window as unknown as MapsWindow)?.google?.maps?.Map;
    }

    if (!MapConstructor) {
      throw new Error("MAP_ERROR");
    }

    const map = new MapConstructor(container, {
      mapId: config.mapId,
      center: { lat: -34.6037, lng: -58.3816 },
      zoom: 12,
    });

    return new GoogleMapInstanceWrapper(map);
  }
}

class GoogleMapInstanceWrapper implements MapInstance {
  private clickListener: { remove?: () => void } | null = null;

  constructor(private map: GoogleMap) {}

  updateZones(zones: CoverageZone[], selectedZoneIds: number[]): void {
    const featureLayer = this.map.getFeatureLayer?.("ADMINISTRATIVE_AREA_LEVEL_2");
    if (featureLayer?.style !== undefined) {
      featureLayer.style = (options: { feature: { placeId: string } }) => {
        const placeId = options?.feature?.placeId;
        const isSelected = zones.some(
          (z) => z.boundary?.placeId === placeId && selectedZoneIds.includes(z.id)
        );
        return {
          fillColor: isSelected ? "#0D9488" : "#E2E8F0",
          fillOpacity: isSelected ? 0.6 : 0.2,
          strokeColor: isSelected ? "#0F766E" : "#94A3B8",
          strokeWeight: isSelected ? 2 : 1,
        };
      };
    }
  }

  onPolygonClick(callback: (placeId: string) => void): void {
    const featureLayer = this.map.getFeatureLayer?.("ADMINISTRATIVE_AREA_LEVEL_2");
    if (featureLayer?.addListener) {
      this.clickListener = featureLayer.addListener("click", (event: GoogleFeatureEvent) => {
        const placeId = event?.feature?.placeId;
        if (placeId) {
          callback(placeId);
        }
      });
    }
  }

  destroy(): void {
    this.clickListener?.remove?.();
    this.clickListener = null;
  }
}
