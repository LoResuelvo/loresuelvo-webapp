import type { ActivityGranularity, ActivityPeriod } from "./activity";

export interface ActivityQuery {
  readonly from?: string;
  readonly to?: string;
  readonly granularity?: ActivityGranularity;
  readonly comparePrevious?: boolean;
}

export function activityInstant(value: unknown): number {
  if (typeof value !== "string") throw new Error("Invalid activity instant");
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (!match) throw new Error("Invalid activity instant");
  calendarDay(match[1]);
  if (Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59 || Number(match[5] ?? 0) > 23 || Number(match[6] ?? 0) > 59) throw new Error("Invalid activity instant");
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error("Invalid activity instant");
  return timestamp;
}

export function validateActivityQuery(query: ActivityQuery, now = new Date()): ActivityQuery {
  if (query.comparePrevious !== undefined && typeof query.comparePrevious !== "boolean") throw new Error("Invalid comparison flag");
  if (query.granularity !== undefined && !["day", "week", "month"].includes(query.granularity)) throw new Error("Invalid granularity");
  if (query.from === undefined && query.to === undefined) return query;
  if (!query.from || !query.to) throw new Error("Incomplete activity range");
  const from = activityInstant(query.from);
  const to = activityInstant(query.to);
  if (from >= to || to > now.getTime() || to - from > 365 * 86400000) throw new Error("Unsupported activity range");
  return query;
}

function calendarDay(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid calendar date");
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Invalid calendar date");
  return date;
}

export function activityQueryForDays(fromDay: string, throughDay: string, granularity: ActivityGranularity, now = new Date()): ActivityQuery {
  calendarDay(fromDay);
  const exclusiveEnd = calendarDay(throughDay);
  exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
  return validateActivityQuery({ from: `${fromDay}T00:00:00-03:00`, to: `${exclusiveEnd.toISOString().slice(0, 10)}T00:00:00-03:00`, granularity }, now);
}

export function activityQueryForPeriod(period: ActivityPeriod): ActivityQuery {
  return { from: period.from, to: period.to, granularity: period.granularity };
}
