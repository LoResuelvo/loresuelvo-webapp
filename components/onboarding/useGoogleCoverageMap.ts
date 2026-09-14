"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CoverageZone } from "@/domain/provider/coverage-zone";
import { MapInstance, MapService, MapServiceStatus } from "@/ports/maps/map-service";
import { getMapService } from "@/infrastructure/maps";

export type MapCoverageZone = CoverageZone;

export interface UseGoogleCoverageMapOptions {
  zones: MapCoverageZone[];
  selectedZoneIds: number[];
  onToggleZone?: (zoneId: number) => void;
  apiKey?: string;
  mapId?: string;
  mapService?: MapService;
}

export type MapStatus = MapServiceStatus;

function handleInitError(err: unknown): { status: MapStatus; message?: string } {
  const msg = err instanceof Error ? err.message : "";
  return msg === "MAP_ERROR"
    ? { status: "error", message: "No se pudo cargar el mapa" }
    : { status: "unavailable" };
}

export function useGoogleCoverageMap(options: UseGoogleCoverageMapOptions) {
  const { zones, selectedZoneIds, onToggleZone, apiKey, mapId, mapService } = options;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<MapStatus>(!apiKey && !mapId ? "unavailable" : "idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mapInstanceRef = useRef<MapInstance | null>(null);

  const zonesRef = useRef(zones);
  zonesRef.current = zones;
  const onToggleZoneRef = useRef(onToggleZone);
  onToggleZoneRef.current = onToggleZone;
  const selectedZoneIdsRef = useRef(selectedZoneIds);
  selectedZoneIdsRef.current = selectedZoneIds;

  const handlePolygonClick = useCallback((placeId: string) => {
    const zone = zonesRef.current.find((z) => z.boundary?.placeId === placeId);
    if (zone && onToggleZoneRef.current) onToggleZoneRef.current(zone.id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const service = mapService || getMapService();
    if (!containerRef.current || mapInstanceRef.current) return;
    if (!apiKey || !mapId) return setStatus("unavailable");

    service.init(containerRef.current, { apiKey, mapId }).then((inst) => {
      if (cancelled) return inst.destroy();
      mapInstanceRef.current = inst;
      inst.onPolygonClick(handlePolygonClick);
      inst.updateZones(zonesRef.current, selectedZoneIdsRef.current);
      setStatus("ready");
    }).catch((err: unknown) => {
      if (cancelled) return;
      const res = handleInitError(err);
      setStatus(res.status);
      if (res.message) setErrorMessage(res.message);
    });

    return () => {
      cancelled = true;
      mapInstanceRef.current?.destroy();
      mapInstanceRef.current = null;
    };
  }, [apiKey, mapId, mapService, handlePolygonClick]);

  useEffect(() => {
    mapInstanceRef.current?.updateZones(zones, selectedZoneIds);
  }, [zones, selectedZoneIds]);

  return { containerRef, status, errorMessage, handlePolygonClick };
}
