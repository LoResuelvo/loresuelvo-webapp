"use client";

import { useState } from "react";
import type { ActivityInterval } from "@/domain/provider/activity";
import { t } from "@/infrastructure/i18n/translations";
import { activityDate, activityRange } from "./activity-format";

const series = [
  { key: "confirmedBookings", color: "#25415c" },
  { key: "reportedCompletions", color: "#147d73" },
  { key: "fullyPaidWorkOrders", color: "#8b5b12" },
] as const;

function shortDate(instant: string): string {
  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date(instant));
  const day = parts.find(p => p.type === "day")?.value ?? "";
  const month = parts.find(p => p.type === "month")?.value ?? "";
  return `${day}/${month}`;
}

function calculateTicks(max: number): { yMax: number; ticks: number[] } {
  if (max <= 4) return { yMax: 4, ticks: [0, 1, 2, 3, 4] };
  const roughStep = max / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;
  let step = magnitude;
  if (normalized > 5) step = 10 * magnitude;
  else if (normalized > 2) step = 5 * magnitude;
  else if (normalized > 1) step = 2 * magnitude;
  const yMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let val = 0; val <= yMax; val += step) {
    ticks.push(val);
  }
  return { yMax, ticks };
}

function getSampleIndices(total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const count = 5;
  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    indices.push(Math.round((i * (total - 1)) / (count - 1)));
  }
  return [...new Set(indices)];
}

export function ActivityEvolutionChart({ intervals }: { intervals: readonly ActivityInterval[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!intervals.length) return null;

  const rawMax = Math.max(0, ...intervals.flatMap(interval => series.map(item => interval[item.key])));
  const { yMax, ticks } = calculateTicks(rawMax);

  const plotLeft = 36;
  const plotRight = 824;
  const plotTop = 20;
  const plotBottom = 175;
  const plotHeight = plotBottom - plotTop;
  const plotWidth = plotRight - plotLeft;

  const groupWidth = plotWidth / intervals.length;
  const groupPadding = Math.max(2, Math.min(14, groupWidth * 0.2));
  const innerWidth = groupWidth - groupPadding;
  const barWidth = Math.max(1, (innerWidth - 4) / 3);
  const barSpacing = barWidth + 2;

  const sampleIndices = new Set(getSampleIndices(intervals.length));

  const hoveredGroupCenter = hoveredIndex !== null ? plotLeft + hoveredIndex * groupWidth + groupWidth / 2 : 0;
  const hoverPercent = (hoveredGroupCenter / 840) * 100;
  const tooltipStyle: React.CSSProperties = { top: "12px" };
  if (hoverPercent < 22) {
    tooltipStyle.left = "16px";
  } else if (hoverPercent > 78) {
    tooltipStyle.right = "16px";
  } else {
    tooltipStyle.left = `${hoverPercent}%`;
    tooltipStyle.transform = "translateX(-50%)";
  }

  return (
    <figure className="relative rounded-xl border border-slate-200 bg-white p-4">
      <figcaption className="flex flex-wrap gap-3 text-xs text-slate-600">
        {series.map(item => (
          <span key={item.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            {t.providerActivity[item.key]}
          </span>
        ))}
      </figcaption>

      {hoveredIndex !== null && intervals[hoveredIndex] && (
        <div
          role="status"
          className="pointer-events-none absolute z-20 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm transition-all"
          style={tooltipStyle}
        >
          <p className="text-xs font-semibold text-slate-800">
            {activityRange(intervals[hoveredIndex].from, intervals[hoveredIndex].to)}
          </p>
          <div className="mt-1.5 space-y-1 text-xs">
            {series.map(item => (
              <div key={item.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {t.providerActivity[item.key]}
                </span>
                <span className="font-semibold tabular-nums text-slate-900">
                  {intervals[hoveredIndex][item.key]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <svg role="img" aria-label={t.providerActivity.evolution} viewBox="0 0 840 215" className="mt-3 w-full overflow-visible">
        {/* Horizontal guide lines and Y-axis scale */}
        {ticks.map(tick => {
          const yPos = plotBottom - (tick / yMax) * plotHeight;
          return (
            <g key={tick}>
              <line
                x1={plotLeft}
                x2={plotRight}
                y1={yPos}
                y2={yPos}
                stroke={tick === 0 ? "#cbd5e1" : "#e2e8f0"}
                strokeDasharray={tick === 0 ? undefined : "4 4"}
                strokeWidth={1}
              />
              <text
                x={plotLeft - 8}
                y={yPos + 4}
                textAnchor="end"
                className="text-[11px] font-mono fill-slate-400 select-none"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Hover column highlight */}
        {hoveredIndex !== null && (
          <rect
            x={plotLeft + hoveredIndex * groupWidth}
            y={plotTop}
            width={groupWidth}
            height={plotHeight}
            fill="#f1f5f9"
            rx={4}
            opacity={0.7}
          />
        )}

        {/* Grouped bars */}
        {intervals.map((interval, index) => {
          const groupX = plotLeft + index * groupWidth + groupPadding / 2;
          return series.map((item, seriesIndex) => {
            const val = interval[item.key];
            const height = val > 0 ? Math.max(2, (val / yMax) * plotHeight) : 0;
            const barX = groupX + seriesIndex * barSpacing;
            const barY = plotBottom - height;
            return (
              <rect
                key={`${interval.from}-${item.key}`}
                x={barX}
                y={barY}
                width={barWidth}
                height={height}
                fill={item.color}
                rx={Math.min(2, barWidth / 2)}
              />
            );
          });
        })}

        {/* X-axis date labels */}
        {intervals.map((interval, index) => {
          if (!sampleIndices.has(index)) return null;
          const centerX = plotLeft + index * groupWidth + groupWidth / 2;
          return (
            <g key={interval.from}>
              <line
                x1={centerX}
                x2={centerX}
                y1={plotBottom}
                y2={plotBottom + 4}
                stroke="#cbd5e1"
                strokeWidth={1}
              />
              <text
                x={centerX}
                y={plotBottom + 18}
                textAnchor="middle"
                className="text-[11px] fill-slate-500 font-medium select-none"
              >
                {shortDate(interval.from)}
              </text>
            </g>
          );
        })}

        {/* Interactive hover/focus hit areas */}
        {intervals.map((interval, index) => (
          <rect
            key={`hit-${interval.from}`}
            x={plotLeft + index * groupWidth}
            y={plotTop}
            width={groupWidth}
            height={plotHeight}
            fill="transparent"
            className="cursor-pointer focus:outline-none"
            tabIndex={0}
            role="button"
            aria-label={`${activityRange(interval.from, interval.to)}: ${interval.confirmedBookings} contrataciones, ${interval.reportedCompletions} finalizaciones, ${interval.fullyPaidWorkOrders} pagos`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onFocus={() => setHoveredIndex(index)}
            onBlur={() => setHoveredIndex(null)}
          />
        ))}
      </svg>

      <div className="mt-1 flex justify-between gap-3 text-xs text-slate-500">
        <span>{activityDate(intervals[0].from)}</span>
        <span>{activityDate(intervals[intervals.length - 1].to)}</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{t.providerActivity.chartHelp}</p>
    </figure>
  );
}

