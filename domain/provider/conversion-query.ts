import {
  compareStatisticsInstants,
  statisticsInstantDurationExceeds,
  statisticsInstantMilliseconds,
} from "./statistics-instant";

export interface ConversionQuery {
  readonly from?: string;
  readonly to?: string;
}

export class FutureConversionDateError extends Error {
  constructor() {
    super("Conversion date cannot be in the future");
    this.name = "FutureConversionDateError";
  }
}

export class InvalidConversionRangeError extends Error {
  constructor(message = "Invalid conversion range") {
    super(message);
    this.name = "InvalidConversionRangeError";
  }
}

function calendarDay(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new InvalidConversionRangeError("Invalid calendar date");
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new InvalidConversionRangeError("Invalid calendar date");
  }
  return date;
}

export function conversionInstant(value: unknown): number {
  try {
    return statisticsInstantMilliseconds(value, 9);
  } catch {
    throw new InvalidConversionRangeError("Invalid conversion instant");
  }
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

export function validateConversionQuery(query: ConversionQuery, now = new Date()): ConversionQuery {
  if (query.from === undefined && query.to === undefined) return query;
  if (!query.from || !query.to) throw new InvalidConversionRangeError("Incomplete conversion range");
  conversionInstant(query.from);
  conversionInstant(query.to);
  if (
    compareStatisticsInstants(query.from, query.to, 9) >= 0 ||
    compareStatisticsInstants(query.to, now.toISOString(), 9) > 0 ||
    statisticsInstantDurationExceeds(query.from, query.to, 365 * 86400000, 9)
  ) {
    throw new InvalidConversionRangeError("Unsupported conversion range");
  }
  return query;
}

export function conversionQueryForDays(
  fromDay: string,
  throughDay: string,
  now = new Date()
): ConversionQuery {
  if (!fromDay || !throughDay) {
    throw new InvalidConversionRangeError("Incomplete conversion range");
  }
  calendarDay(fromDay);
  const exclusiveEnd = calendarDay(throughDay);
  const today = buenosAiresToday(now);
  if (fromDay > today || throughDay > today) throw new FutureConversionDateError();
  exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
  const to = throughDay === today ? now.toISOString() : `${exclusiveEnd.toISOString().slice(0, 10)}T00:00:00-03:00`;
  return validateConversionQuery({ from: `${fromDay}T00:00:00-03:00`, to }, now);
}

export function conversionQueryForPeriod(period: { readonly from: string; readonly to: string }): ConversionQuery {
  return { from: period.from, to: period.to };
}
