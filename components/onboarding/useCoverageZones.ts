"use client";

import { useState, useEffect, useCallback } from "react";
import { CoverageZone } from "@/domain/provider/coverage-zone";
import { getCoverageZonesAction } from "@/app/actions/coverage-zones";
import { t } from "@/infrastructure/i18n/translations";

export type CoverageZoneCatalogStatus = "idle" | "loading" | "ready" | "empty" | "error";

export interface UseCoverageZonesResult {
  zones: CoverageZone[];
  selectedZoneIds: number[];
  isLoading: boolean;
  status: CoverageZoneCatalogStatus;
  error: string | null;
  loadZones: () => Promise<void>;
  toggleZone: (zoneId: number) => void;
}

export function useCoverageZones(role: "consumer" | "provider" | null): UseCoverageZonesResult {
  const [zones, setZones] = useState<CoverageZone[]>([]);
  const [selectedZoneIds, setSelectedZoneIds] = useState<number[]>([]);
  const [status, setStatus] = useState<CoverageZoneCatalogStatus>(
    role === "provider" ? "loading" : "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const loadZones = useCallback(async () => {
    if (role !== "provider") return;
    setStatus("loading");
    setError(null);
    try {
      const result = await getCoverageZonesAction();
      if (result.success) {
        setZones(result.data);
        setStatus(result.data.length === 0 ? "empty" : "ready");
      } else {
        const errorMsg = result.error || t.onboarding.coverageZones.errorMessage;
        setError(errorMsg);
        setStatus("error");
      }
    } catch {
      setError(t.onboarding.coverageZones.errorMessage);
      setStatus("error");
    }
  }, [role]);

  useEffect(() => {
    if (role === "provider") {
      loadZones();
    }
  }, [role, loadZones]);

  const toggleZone = useCallback((zoneId: number) => {
    setSelectedZoneIds((prev) =>
      prev.includes(zoneId) ? prev.filter((id) => id !== zoneId) : [...prev, zoneId]
    );
  }, []);

  return {
    zones,
    selectedZoneIds,
    isLoading: status === "loading",
    status,
    error,
    loadZones,
    toggleZone,
  };
}
