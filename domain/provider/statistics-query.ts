import type { StatisticsGranularity, StatisticsPeriod } from "./statistics-period";
import {
  compareStatisticsInstants,
  statisticsInstantDurationExceeds,
  statisticsInstantMilliseconds,
} from "./statistics-instant";

export interface StatisticsQuery {
  readonly from?: string;
  readonly to?: string;
  readonly granularity?: StatisticsGranularity;
  readonly comparePrevious?: boolean;
}

export class FutureStatisticsDateError extends Error {
  constructor() {
    super("Activity date cannot be in the future");
    this.name = "FutureStatisticsDateError";
  }
}

export function statisticsInstant(value: unknown): number {
  try {
    return statisticsInstantMilliseconds(value);
  } catch {
    throw new Error("Invalid activity instant");
  }
}

export function validateStatisticsQuery(query: StatisticsQuery, now = new Date()): StatisticsQuery {
  if (query.comparePrevious !== undefined && typeof query.comparePrevious !== "boolean") throw new Error("Invalid comparison flag");
  if (query.granularity !== undefined && !["day", "week", "month"].includes(query.granularity)) throw new Error("Invalid granularity");
  if (query.from === undefined && query.to === undefined) return query;
  if (!query.from || !query.to) throw new Error("Incomplete activity range");
  const from = query.from;
  const to = query.to;
  if (
    compareStatisticsInstants(from, to) >= 0 ||
    compareStatisticsInstants(to, now.toISOString()) > 0 ||
    statisticsInstantDurationExceeds(from, to, 365 * 86400000)
  ) throw new Error("Unsupported activity range");
  return query;
}

function calendarDay(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid calendar date");
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Invalid calendar date");
  return date;
}

function buenosAiresToday(now: Date): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: "year" | "month" | "day") => parts.find(value => value.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function statisticsQueryForDays(fromDay: string, throughDay: string, granularity: StatisticsGranularity, now = new Date()): StatisticsQuery {
  calendarDay(fromDay);
  const exclusiveEnd = calendarDay(throughDay);
  const today = buenosAiresToday(now);
  if (fromDay > today || throughDay > today) throw new FutureStatisticsDateError();
  exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
  const to = throughDay === today ? now.toISOString() : `${exclusiveEnd.toISOString().slice(0, 10)}T00:00:00-03:00`;
  return validateStatisticsQuery({ from: `${fromDay}T00:00:00-03:00`, to, granularity }, now);
}

export function statisticsQueryForPeriod(period: StatisticsPeriod): StatisticsQuery {
  return { from: period.from, to: period.to, granularity: period.granularity };
}
