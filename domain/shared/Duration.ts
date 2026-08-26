export type Duration = {
  readonly minutes: number;
};

export const MIN_DURATION_MINUTES = 15;
export const MAX_DURATION_MINUTES = 1440;

function isValid(minutes: unknown): boolean {
  if (typeof minutes !== "number" || !Number.isInteger(minutes)) {
    return false;
  }
  return minutes >= MIN_DURATION_MINUTES && minutes <= MAX_DURATION_MINUTES;
}

function create(minutes: number): Duration {
  if (typeof minutes !== "number" || !Number.isInteger(minutes)) {
    throw new Error("Duration requires an integer number of minutes");
  }
  if (minutes < MIN_DURATION_MINUTES || minutes > MAX_DURATION_MINUTES) {
    throw new Error(
      `Duration must be between ${MIN_DURATION_MINUTES} and ${MAX_DURATION_MINUTES} minutes`
    );
  }
  return Object.freeze({ minutes });
}

function format(durationOrMinutes: Duration | number | null | undefined): string {
  if (durationOrMinutes === null || durationOrMinutes === undefined) {
    return "";
  }
  const mins =
    typeof durationOrMinutes === "number"
      ? durationOrMinutes
      : durationOrMinutes.minutes;

  if (!Number.isFinite(mins) || mins <= 0) {
    return "";
  }

  const hours = Math.floor(mins / 60);
  const remainingMinutes = mins % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }
  if (remainingMinutes === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${remainingMinutes} min`;
}

export const Duration = {
  MIN_MINUTES: MIN_DURATION_MINUTES,
  MAX_MINUTES: MAX_DURATION_MINUTES,
  create,
  format,
  isValid,
};
