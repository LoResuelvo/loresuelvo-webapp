import { differenceInCalendarDays, format } from "date-fns";

export type ChatDaySeparatorInfo =
  | { key: string; kind: "today" | "yesterday"; date: Date }
  | { key: string; kind: "weekday"; weekdayIndex: number; date: Date }
  | { key: string; kind: "date"; date: Date };

export function getChatDaySeparatorInfo(
  timestamp?: string | null,
  referenceDate: Date = new Date(),
): ChatDaySeparatorInfo | null {
  if (!timestamp) return null;

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;

  const daysAgo = differenceInCalendarDays(referenceDate, date);
  const key = format(date, "yyyy-MM-dd");

  if (daysAgo === 0) return { key, kind: "today", date };
  if (daysAgo === 1) return { key, kind: "yesterday", date };
  if (daysAgo >= 2 && daysAgo < 7) {
    return { key, kind: "weekday", weekdayIndex: date.getDay(), date };
  }

  return { key, kind: "date", date };
}
