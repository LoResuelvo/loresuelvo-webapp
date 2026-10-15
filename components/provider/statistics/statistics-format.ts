import { t } from "@/infrastructure/i18n/translations";

export function statisticsMoney(cents: number | null): string {
  if (cents === null) return t.providerActivity.unavailable;
  const whole = BigInt(cents) / BigInt(100);
  const fraction = (BigInt(Math.abs(cents)) % BigInt(100)).toString().padStart(2, "0");
  const signedWhole = cents < 0 && whole === BigInt(0) ? -0 : whole;
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })
    .formatToParts(signedWhole)
    .map(part => part.type === "fraction" ? fraction : part.value)
    .join("");
}

export function statisticsDate(instant: string): string {
  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires", year: "2-digit", month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === type)!.value;
  // Explicit separators keep SSR and browser output independent of localized spaces.
  return `${part("day")}/${part("month")}/${part("year")}, ${part("hour")}:${part("minute")}`;
}

export function statisticsDay(instant: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(instant));
  const part = (type: "year" | "month" | "day") => parts.find(value => value.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function statisticsRange(from: string, to: string): string {
  return `${statisticsDate(from)} → ${statisticsDate(to)}`;
}
