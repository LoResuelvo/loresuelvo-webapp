export interface StatisticsInstantParts {
  readonly seconds: number;
  readonly fraction: string;
}

const instantPattern = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-](\d{2}):(\d{2}))$/;

export function statisticsInstantParts(value: unknown, maxFractionDigits?: number): StatisticsInstantParts {
  if (typeof value !== "string") throw new Error("Invalid RFC3339 instant");
  const match = instantPattern.exec(value);
  if (!match) throw new Error("Invalid RFC3339 instant");

  const [, datePart, hour, minute, second, fraction = "", zone, offsetHour, offsetMinute] = match;
  if (maxFractionDigits !== undefined && fraction.length > maxFractionDigits) {
    throw new Error("Invalid RFC3339 instant precision");
  }
  if (
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59 ||
    Number(offsetHour ?? 0) > 23 ||
    Number(offsetMinute ?? 0) > 59
  ) {
    throw new Error("Invalid RFC3339 instant");
  }

  const calendarDay = new Date(`${datePart}T00:00:00Z`);
  if (!Number.isFinite(calendarDay.getTime()) || calendarDay.toISOString().slice(0, 10) !== datePart) {
    throw new Error("Invalid RFC3339 instant");
  }

  // Validate the calendar and zone with seconds precision; keep the fraction as
  // decimal text because Date only retains milliseconds.
  const wholeSecondMilliseconds = Date.parse(`${datePart}T${hour}:${minute}:${second}${zone}`);
  if (!Number.isFinite(wholeSecondMilliseconds)) throw new Error("Invalid RFC3339 instant");
  return { seconds: Math.floor(wholeSecondMilliseconds / 1000), fraction };
}

function compareFractions(left: string, right: string): number {
  const precision = Math.max(left.length, right.length);
  const normalizedLeft = left.padEnd(precision, "0");
  const normalizedRight = right.padEnd(precision, "0");
  return normalizedLeft === normalizedRight ? 0 : normalizedLeft < normalizedRight ? -1 : 1;
}

export function compareStatisticsInstants(left: string, right: string, maxFractionDigits?: number): number {
  const leftParts = statisticsInstantParts(left, maxFractionDigits);
  const rightParts = statisticsInstantParts(right, maxFractionDigits);
  if (leftParts.seconds !== rightParts.seconds) return leftParts.seconds < rightParts.seconds ? -1 : 1;
  return compareFractions(leftParts.fraction, rightParts.fraction);
}

export function statisticsPeriodsHaveEqualDuration(
  left: { readonly from: string; readonly to: string },
  right: { readonly from: string; readonly to: string }
): boolean {
  const parts = [left.from, left.to, right.from, right.to].map(value => statisticsInstantParts(value));
  const precision = Math.max(...parts.map(part => part.fraction.length));
  const scale = BigInt(10) ** BigInt(precision);
  const instants = parts.map(part =>
    BigInt(part.seconds) * scale + BigInt(part.fraction.padEnd(precision, "0") || "0")
  );
  return instants[1] - instants[0] === instants[3] - instants[2];
}

export function statisticsInstantDurationExceeds(
  from: string,
  to: string,
  maximumMilliseconds: number,
  maxFractionDigits?: number
): boolean {
  if (!Number.isSafeInteger(maximumMilliseconds) || maximumMilliseconds < 0) {
    throw new Error("Invalid instant duration limit");
  }
  const start = statisticsInstantParts(from, maxFractionDigits);
  const end = statisticsInstantParts(to, maxFractionDigits);
  const precision = Math.max(3, start.fraction.length, end.fraction.length);
  const scale = BigInt(10) ** BigInt(precision);
  const instantAtScale = (part: StatisticsInstantParts) =>
    BigInt(part.seconds) * scale + BigInt(part.fraction.padEnd(precision, "0") || "0");
  const duration = instantAtScale(end) - instantAtScale(start);
  const maximum = BigInt(maximumMilliseconds) * BigInt(10) ** BigInt(precision - 3);
  return duration > maximum;
}

export function statisticsInstantMilliseconds(value: unknown, maxFractionDigits?: number): number {
  const instant = statisticsInstantParts(value, maxFractionDigits);
  const milliseconds = Number((instant.fraction + "000").slice(0, 3));
  return instant.seconds * 1000 + milliseconds;
}
