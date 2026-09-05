"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CoverageZone } from "@/domain/provider/coverage-zone";

export type MapCoverageZone = CoverageZone;

export interface UseGoogleCoverageMapOptions {
  zones: MapCoverageZone[];
  selectedZoneIds: number[];
  onToggleZone?: (zoneId: number) => void;
  apiKey?: string;
  mapId?: string;
}

export type MapStatus = "idle" | "ready" | "unavailable" | "error";

interface GoogleFeatureEvent {
  feature?: {
    placeId?: string;
  };
}

interface GoogleFeatureLayer {
  addListener?: (event: string, handler: (e: GoogleFeatureEvent) => void) => { remove?: () => void };
  style?: (options: { feature: { placeId: string } }) => Record<string, unknown>;
}

export interface GoogleMapInstance {
  getFeatureLayer?: (layerId: string) => GoogleFeatureLayer | undefined;
}

interface MockMapsWindow {
  google?: {
    maps?: {
      Map: new (
        container: HTMLElement,
        options: { mapId?: string; center?: { lat: number; lng: number }; zoom?: number }
      ) => GoogleMapInstance;
    };
  };
  __MOCK_MAPS_CONFIG__?: string;
  __MOCK_MAPS_ERROR__?: boolean;
}

function getMapsWindow(): MockMapsWindow | null {
  if (typeof window === "undefined") return null;
  return window as unknown as MockMapsWindow;
}

function computeFeatureStyle(
  zones: MapCoverageZone[],
  selectedZoneIds: number[],
  placeId?: string
) {
  const isSelected = zones.some(
    (z) => z.boundary?.placeId === placeId && selectedZoneIds.includes(z.id)
  );
  return {
    fillColor: isSelected ? "#0D9488" : "#94A3B8",
    fillOpacity: isSelected ? 0.6 : 0.2,
    strokeColor: isSelected ? "#0F766E" : "#64748B",
    strokeWeight: isSelected ? 2 : 1,
  };
}

function initGoogleMap(
  container: HTMLDivElement,
  mapId: string | undefined,
  onPlaceClick: (placeId: string) => void
) {
  const win = getMapsWindow();
  const MapConstructor = win?.google?.maps?.Map;
  if (!MapConstructor) return null;

  const map = new MapConstructor(container, {
    mapId,
    center: { lat: -34.6037, lng: -58.3816 },
    zoom: 12,
  });

  const featureLayer = map.getFeatureLayer?.("ADMINISTRATIVE_AREA_LEVEL_2");
  let clickListener: { remove?: () => void } | null = null;
  if (featureLayer?.addListener) {
    clickListener = featureLayer.addListener("click", (event: GoogleFeatureEvent) => {
      const placeId = event?.feature?.placeId;
      if (placeId) onPlaceClick(placeId);
    });
  }

  return { map, clickListener };
}

function updateMapFeatureStyle(
  map: GoogleMapInstance | null,
  zones: MapCoverageZone[],
  selectedZoneIds: number[]
) {
  const featureLayer = map?.getFeatureLayer?.("ADMINISTRATIVE_AREA_LEVEL_2");
  if (featureLayer?.style !== undefined) {
    featureLayer.style = (options: { feature: { placeId: string } }) =>
      computeFeatureStyle(zones, selectedZoneIds, options?.feature?.placeId);
  }
}

function checkFallbackStatus(apiKey?: string, mapId?: string): MapStatus | null {
  const win = getMapsWindow();
  if (win) {
    if (win.__MOCK_MAPS_CONFIG__ === "missing") return "unavailable";
    if (win.__MOCK_MAPS_ERROR__ === true) return "error";
  }
  if (!apiKey || !mapId || !win?.google?.maps) return "unavailable";
  return null;
}

export function useGoogleCoverageMap({
  zones,
  selectedZoneIds,
  onToggleZone,
  apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID,
}: UseGoogleCoverageMapOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<MapStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mapInstanceRef = useRef<GoogleMapInstance | null>(null);
  const clickListenerRef = useRef<{ remove?: () => void } | null>(null);

  const handlePolygonClick = useCallback(
    (placeId: string) => {
      const zone = zones.find((z) => z.boundary?.placeId === placeId);
      if (zone && onToggleZone) onToggleZone(zone.id);
    },
    [zones, onToggleZone]
  );

  useEffect(() => {
    const fallback = checkFallbackStatus(apiKey, mapId);
    if (fallback) {
      setStatus(fallback);
      if (fallback === "error") setErrorMessage("No se pudo cargar Google Maps");
      return;
    }
    try {
      if (containerRef.current && !mapInstanceRef.current) {
        const result = initGoogleMap(containerRef.current, mapId, handlePolygonClick);
        if (result) {
          mapInstanceRef.current = result.map;
          clickListenerRef.current = result.clickListener;
        }
      }
      setStatus("ready");
    } catch {
      setStatus("error");
      setErrorMessage("No se pudo cargar Google Maps");
    }
    return () => {
      clickListenerRef.current?.remove?.();
      clickListenerRef.current = null;
      mapInstanceRef.current = null;
    };
  }, [apiKey, mapId, handlePolygonClick]);

  useEffect(() => {
    updateMapFeatureStyle(mapInstanceRef.current, zones, selectedZoneIds);
  }, [zones, selectedZoneIds]);

  return { containerRef, status, errorMessage, handlePolygonClick };
}
