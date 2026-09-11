export type CalendarCallbackResult = "success" | "cancelled";

export function parseCalendarCallbackResult(
  value: string | string[] | null | undefined,
): CalendarCallbackResult | null {
  if (Array.isArray(value) || (value !== "success" && value !== "cancelled")) {
    return null;
  }

  return value;
}
