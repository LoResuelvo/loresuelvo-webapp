import { MapService } from "@/ports/maps/map-service";
import { GoogleMapsAdapter } from "./google-maps-adapter";
import { MockMapAdapter } from "./mock-map-adapter";

let defaultService: MapService | null = null;

function isE2ETestSession(): boolean {
  if (typeof document !== "undefined") {
    return document.cookie.includes("__e2e_scenario");
  }
  return false;
}

export function getMapService(): MapService {
  if (defaultService) {
    return defaultService;
  }

  if (isE2ETestSession() || process.env.NODE_ENV === "test") {
    return new MockMapAdapter();
  }

  return new GoogleMapsAdapter();
}

export function setMapService(service: MapService | null): void {
  defaultService = service;
}
