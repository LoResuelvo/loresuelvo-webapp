import { differenceInCalendarDays, format, isSameDay, subDays } from "date-fns";

const DAYS_OF_WEEK = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

/**
 * Formats a message timestamp for conversation list items:
 * - Today: "HH:mm" (e.g. "05:52", "14:30")
 * - Yesterday: "Ayer"
 * - 2 to 6 days ago: Name of the day in Spanish (e.g. "Lunes", "Martes")
 * - 7 or more days ago: Full date with year "dd/MM/yyyy" (e.g. "19/08/2026")
 */
export function formatConversationLastMessageDate(
  dateInput?: string | Date | null,
  referenceDate: Date = new Date()
): string {
  if (!dateInput) return "";

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  if (isSameDay(date, referenceDate)) {
    return format(date, "HH:mm");
  }

  const yesterday = subDays(referenceDate, 1);
  if (isSameDay(date, yesterday)) {
    return "Ayer";
  }

  const daysDiff = differenceInCalendarDays(referenceDate, date);
  if (daysDiff >= 2 && daysDiff < 7) {
    return DAYS_OF_WEEK[date.getDay()];
  }

  return format(date, "dd/MM/yyyy");
}
