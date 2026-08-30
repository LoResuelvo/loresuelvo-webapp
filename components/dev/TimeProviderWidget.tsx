"use client";

import { useState } from "react";
import { useClock } from "@/hooks/useClock";
import { formatClockTime } from "@/lib/date/clock-utils";
import { Button } from "@/components/ui/button";
import { Clock as ClockIcon, X, RotateCcw, Check } from "lucide-react";

const SHIFT_PRESETS = [
  { unit: "1h", hours: 1, text: "1 hora" },
  { unit: "1d", hours: 24, text: "1 día" },
  { unit: "1w", hours: 168, text: "1 semana" },
] as const;

export function TimeProviderWidget() {
  const { now, isSimulated, setTime, resetTime } = useClock();
  const [isOpen, setIsOpen] = useState(false);
  const [customDateTime, setCustomDateTime] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  const currentDate = now();
  const { time: formattedTime} = formatClockTime(currentDate);

  const handleShift = async (hours: number) => {
    setIsApplying(true);
    try {
      await setTime(new Date(currentDate.getTime() + hours * 60 * 60 * 1000));
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDateTime) return;
    setIsApplying(true);
    try {
      await setTime(customDateTime);
    } finally {
      setIsApplying(false);
    }
  };

  const handleReset = async () => {
    setIsApplying(true);
    try {
      await resetTime();
      setCustomDateTime("");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      className="fixed bottom-4 left-4 z-50 flex flex-col items-start font-sans"
      data-testid="dev-time-travel-widget"
    >
      {isOpen ? (
        <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-xl p-3.5 w-72 text-card-foreground space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span
                className="text-xs font-mono font-bold text-foreground tracking-tight truncate"
                data-testid="widget-current-time"
              >
                {formattedTime}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {isSimulated && (
                <button
                  onClick={handleReset}
                  disabled={isApplying}
                  className="text-badge-warning-fg hover:bg-badge-warning-bg p-1 rounded-md transition-colors cursor-pointer"
                  title="Restablecer a tiempo real"
                  aria-label="Restablecer hora"
                  data-testid="widget-reset-btn"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-md transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Steppers */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            {SHIFT_PRESETS.map(({ unit, hours, text }) => (
              <div key={unit} className="flex bg-muted/80 rounded-lg p-0.5 border border-border">
                <button
                  type="button"
                  className="flex-1 py-1 text-caption font-medium text-muted-foreground hover:text-foreground hover:bg-card rounded-md transition-all cursor-pointer disabled:opacity-50"
                  onClick={() => handleShift(-hours)}
                  disabled={isApplying}
                  aria-label={`Retroceder ${text}`}
                >
                  -{unit}
                </button>
                <button
                  type="button"
                  className="flex-1 py-1 text-caption font-medium text-muted-foreground hover:text-foreground hover:bg-card rounded-md transition-all cursor-pointer disabled:opacity-50"
                  onClick={() => handleShift(hours)}
                  disabled={isApplying}
                  aria-label={`Avanzar ${text}`}
                >
                  +{unit}
                </button>
              </div>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleApplyCustom} className="flex gap-1.5 pt-0.5">
            <input
              type="datetime-local"
              value={customDateTime}
              onChange={(e) => setCustomDateTime(e.target.value)}
              className="flex-1 text-caption border border-input rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring bg-input/20 text-foreground"
              data-testid="widget-datetime-input"
            />
            <Button
              type="submit"
              variant="brand"
              size="sm"
              className="h-7 px-2.5 text-caption rounded-lg cursor-pointer font-medium"
              disabled={!customDateTime || isApplying}
            >
              <Check className="w-3 h-3" />
            </Button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className={`w-8 h-8 rounded-full shadow-md border flex items-center justify-center transition-all cursor-pointer ${
            isSimulated
              ? "bg-brand-tertiary hover:bg-brand-tertiary/90 text-brand-primary border-brand-tertiary ring-2 ring-brand-tertiary/50"
              : "bg-brand-primary hover:bg-brand-primary/90 text-white border-brand-primary hover:scale-105"
          }`}
          data-testid="widget-toggle-btn"
          aria-label="Abrir reloj"
          title={isSimulated ? "Reloj simulado" : "Reloj"}
        >
          <ClockIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
