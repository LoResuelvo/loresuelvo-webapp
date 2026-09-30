import type { ActivityInterval } from "@/domain/provider/activity";
import { t } from "@/infrastructure/i18n/translations";
import { activityDate } from "./activity-format";

const series = [
  { key: "confirmedBookings", color: "#25415c" },
  { key: "reportedCompletions", color: "#147d73" },
  { key: "fullyPaidWorkOrders", color: "#8b5b12" },
] as const;

export function ActivityEvolutionChart({ intervals }: { intervals: readonly ActivityInterval[] }) {
  if (!intervals.length) return null;
  const maximum = Math.max(1, ...intervals.flatMap(interval => series.map(item => interval[item.key])));
  const bucketWidth = 800 / intervals.length;
  return (
    <figure className="rounded-xl border border-slate-200 bg-white p-4">
      <figcaption className="flex flex-wrap gap-3 text-xs text-slate-600">
        {series.map(item => <span key={item.key} className="flex items-center gap-1"><span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{t.providerActivity[item.key]}</span>)}
      </figcaption>
      <svg aria-hidden="true" viewBox="0 0 840 190" className="mt-3 w-full">
        <line x1="20" x2="820" y1="170" y2="170" stroke="#cbd5e1" />
        {intervals.map((interval, index) => series.map((item, seriesIndex) => {
          const height = interval[item.key] / maximum * 150;
          return <rect key={`${interval.from}-${item.key}`} x={20 + index * bucketWidth + seriesIndex * bucketWidth / 3} y={170 - height} width={Math.max(0.2, bucketWidth / 3 - 1)} height={height} fill={item.color} />;
        }))}
      </svg>
      <div className="flex justify-between gap-3 text-xs text-slate-600"><span>{activityDate(intervals[0].from)}</span><span>{activityDate(intervals[intervals.length - 1].to)}</span></div>
      <p className="mt-2 text-xs text-slate-600">{t.providerActivity.chartHelp}</p>
    </figure>
  );
}
