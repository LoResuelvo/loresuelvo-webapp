export interface ClockTimeFormatted {
  time: string;
}

/**
 * Formats a Date object into localized time and year strings for UI display.
 */
export function formatClockTime(date: Date): ClockTimeFormatted {
  const time = date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });



  return { time };
}
