export type ScheduledDateTime = {
  readonly isoString: string;
};

function create(input: string | Date): ScheduledDateTime {
  if (!input) {
    throw new Error("ScheduledDateTime requires a valid non-empty date string");
  }

  const date = typeof input === "string" ? new Date(input) : input;

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${String(input)}`);
  }

  return Object.freeze({
    isoString: typeof input === "string" ? input : date.toISOString(),
  });
}

function toDate(sdt: ScheduledDateTime): Date {
  return new Date(sdt.isoString);
}

function formatDateOnly(sdt: ScheduledDateTime): string {
  const date = toDate(sdt);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatRawTime(sdt: ScheduledDateTime): string {
  const date = toDate(sdt);
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatTimeOnly(sdt: ScheduledDateTime): string {
  return `${formatRawTime(sdt)} hs`;
}

function formatWithTime(sdt: ScheduledDateTime): string {
  return `${formatDateOnly(sdt)} - ${formatTimeOnly(sdt)}`;
}

function isPast(sdt: ScheduledDateTime, now: Date = new Date()): boolean {
  return toDate(sdt).getTime() < now.getTime();
}

function isFuture(sdt: ScheduledDateTime, now: Date = new Date()): boolean {
  return toDate(sdt).getTime() > now.getTime();
}

function compare(a: ScheduledDateTime, b: ScheduledDateTime): number {
  return toDate(a).getTime() - toDate(b).getTime();
}

function equals(a: ScheduledDateTime, b: ScheduledDateTime): boolean {
  return toDate(a).getTime() === toDate(b).getTime();
}

export const ScheduledDateTime = {
  create,
  toDate,
  formatDateOnly,
  formatRawTime,
  formatTimeOnly,
  formatWithTime,
  isPast,
  isFuture,
  compare,
  equals,
};
