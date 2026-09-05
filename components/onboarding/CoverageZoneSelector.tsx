"use client";

import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";
import { cn } from "@/lib/utils";
import { CoverageZone } from "@/domain/provider/coverage-zone";
import { useGoogleCoverageMap } from "./useGoogleCoverageMap";

export type CoverageZoneItem = CoverageZone;

export interface CoverageZoneSelectorProps {
  zones: CoverageZoneItem[];
  selectedZoneIds?: number[];
  isLoading?: boolean;
  error?: string | null;
  validationError?: string | null;
  onRetry?: () => void;
  onToggleZone?: (zoneId: number) => void;
  className?: string;
}

function CoverageZoneLoading({ className }: { className?: string }) {
  return (
    <div
      className={cn("space-y-2 rounded-lg border border-border bg-brand-neutral/20 p-4", className)}
      data-testid="coverage-zones-loading"
      aria-busy="true"
      aria-live="polite"
    >
      <Label className="text-body font-semibold text-brand-primary">
        {t.onboarding.coverageZones.title}
      </Label>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
        <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
        <span>{t.onboarding.coverageZones.loading}</span>
      </div>
    </div>
  );
}

function CoverageZoneError({
  error,
  onRetry,
  className,
}: {
  error: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn("space-y-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4", className)}
      data-testid="coverage-zones-error"
      role="alert"
    >
      <Label className="text-body font-semibold text-destructive">
        {t.onboarding.coverageZones.title}
      </Label>
      <p className="text-sm text-destructive">{error}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center text-sm font-semibold text-brand-primary underline hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          {t.onboarding.coverageZones.retryButton}
        </button>
      )}
    </div>
  );
}

function CoverageZoneEmpty({ className }: { className?: string }) {
  return (
    <div
      className={cn("space-y-2 rounded-lg border border-border bg-brand-neutral/20 p-4", className)}
      data-testid="coverage-zones-empty"
    >
      <Label className="text-body font-semibold text-brand-primary">
        {t.onboarding.coverageZones.title}
      </Label>
      <p className="text-sm text-muted-foreground py-2">
        {t.onboarding.coverageZones.emptyMessage}
      </p>
    </div>
  );
}

function CoverageZoneList({
  zones,
  selectedZoneIds,
  onToggleZone,
}: {
  zones: CoverageZoneItem[];
  selectedZoneIds: number[];
  onToggleZone?: (zoneId: number) => void;
}) {
  return (
    <div
      role="group"
      aria-label={t.onboarding.coverageZones.title}
      className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-border bg-brand-neutral/10 p-2"
      data-testid="coverage-zones-list"
    >
      {zones.map((zone) => {
        const isSelected = selectedZoneIds.includes(zone.id);
        return (
          <label
            key={zone.id}
            data-testid={`coverage-zone-item-${zone.id}`}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium cursor-pointer transition-colors border",
              isSelected
                ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                : "border-transparent bg-white hover:bg-brand-neutral/30 text-brand-primary"
            )}
          >
            <input
              type="checkbox"
              name="coverageZones"
              value={zone.id}
              checked={isSelected}
              onChange={() => onToggleZone?.(zone.id)}
              className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
            />
            <span className="flex-1">{zone.name}</span>
          </label>
        );
      })}
    </div>
  );
}

function CoverageZoneMap({
  zones,
  selectedZoneIds,
  onToggleZone,
}: {
  zones: CoverageZoneItem[];
  selectedZoneIds: number[];
  onToggleZone?: (zoneId: number) => void;
}) {
  const { containerRef } = useGoogleCoverageMap({
    zones,
    selectedZoneIds,
    onToggleZone,
  });

  return (
    <div
      ref={containerRef}
      data-testid="coverage-map"
      aria-label={t.onboarding.coverageZones.mapTitle}
      className="relative rounded-lg border border-dashed border-border bg-brand-neutral/20 p-4 text-center"
    >
      <p className="text-xs font-semibold text-muted-foreground">
        {t.onboarding.coverageZones.mapTitle}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {zones.map((zone) => {
          const isSelected = selectedZoneIds.includes(zone.id);
          return (
            <button
              key={zone.id}
              type="button"
              data-testid={`map-zone-${zone.id}`}
              data-selected={isSelected ? "true" : "false"}
              aria-pressed={isSelected}
              onClick={() => onToggleZone?.(zone.id)}
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
        })}
      </div>
    </div>
  );
}

export function CoverageZoneSelector({
  zones,
  selectedZoneIds = [],
  isLoading = false,
  error = null,
  validationError = null,
  onRetry,
  onToggleZone,
  className,
}: CoverageZoneSelectorProps) {
  if (isLoading) {
    return <CoverageZoneLoading className={className} />;
  }

  if (error) {
    return <CoverageZoneError error={error} onRetry={onRetry} className={className} />;
  }

  if (zones.length === 0) {
    return <CoverageZoneEmpty className={className} />;
  }

  return (
    <div className={cn("space-y-3", className)} data-testid="coverage-zones-container">
      <div className="space-y-1">
        <Label className="text-body font-semibold text-brand-primary">
          {t.onboarding.coverageZones.title}
        </Label>
        <p className="text-xs text-muted-foreground">
          {t.onboarding.coverageZones.subtitle}
        </p>
      </div>

      <CoverageZoneList
        zones={zones}
        selectedZoneIds={selectedZoneIds}
        onToggleZone={onToggleZone}
      />

      {validationError && (
        <p className="text-sm text-destructive" role="alert" data-testid="coverage-zones-validation-error">
          {validationError}
        </p>
      )}

      <CoverageZoneMap
        zones={zones}
        selectedZoneIds={selectedZoneIds}
        onToggleZone={onToggleZone}
      />
    </div>
  );
}
