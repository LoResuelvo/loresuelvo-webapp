"use client";

import { t } from "@/infrastructure/i18n/translations";
import { cn } from "@/lib/utils";
import { CoverageZone } from "@/domain/provider/coverage-zone";
import { useGoogleCoverageMap } from "./useGoogleCoverageMap";

export interface CoverageZoneMapProps {
  zones: CoverageZone[];
  selectedZoneIds: number[];
  onToggleZone?: (zoneId: number) => void;
  className?: string;
}

function MapZoneButton({
  zone,
  isSelected,
  onToggle,
}: {
  zone: CoverageZone;
  isSelected: boolean;
  onToggle?: (id: number) => void;
}) {
  return (
    <button
      type="button"
      data-testid={`map-zone-${zone.id}`}
      data-selected={isSelected ? "true" : "false"}
      aria-pressed={isSelected}
      onClick={() => onToggle?.(zone.id)}
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
        isSelected
          ? "border-brand-primary bg-brand-primary text-white"
          : "border-border bg-white text-muted-foreground hover:bg-brand-neutral/30"
      )}
    >
      {zone.name}
    </button>
  );
}

export const MAP_UNAVAILABLE_MESSAGE =
  "El mapa no está disponible. Puedes continuar la selección desde la lista.";

export function CoverageZoneMap({
  zones,
  selectedZoneIds,
  onToggleZone,
  className,
}: CoverageZoneMapProps) {
  const { containerRef, status } = useGoogleCoverageMap({
    zones,
    selectedZoneIds,
    onToggleZone,
  });

  const isMapUnavailable = status === "unavailable" || status === "error";

  return (
    <div
      ref={containerRef}
      data-testid="coverage-map"
      aria-label={t.onboarding.coverageZones.mapTitle}
      className={cn(
        "relative rounded-lg border border-dashed border-border bg-brand-neutral/20 p-4 text-center",
        className
      )}
    >
      <p className="text-xs font-semibold text-muted-foreground">
        {t.onboarding.coverageZones.mapTitle}
      </p>
      {isMapUnavailable && (
        <p
          data-testid="coverage-map-unavailable"
          role="status"
          className="mt-1 text-xs text-muted-foreground"
        >
          {MAP_UNAVAILABLE_MESSAGE}
        </p>
      )}
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {zones.map((zone) => (
          <MapZoneButton
            key={zone.id}
            zone={zone}
            isSelected={selectedZoneIds.includes(zone.id)}
            onToggle={onToggleZone}
          />
        ))}
      </div>
    </div>
  );
}
