import { t } from "@/infrastructure/i18n/translations";

export function activityMoney(cents: number | null): string {
  if (cents === null) return t.providerActivity.unavailable;
  const whole = BigInt(cents) / BigInt(100);
  const fraction = (BigInt(Math.abs(cents)) % BigInt(100)).toString().padStart(2, "0");
  const signedWhole = cents < 0 && whole === BigInt(0) ? -0 : whole;
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })
    .formatToParts(signedWhole)
    .map(part => part.type === "fraction" ? fraction : part.value)
    .join("");
}

export function activityDate(instant: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short",
  }).format(new Date(instant));
}

export function activityRange(from: string, to: string): string {
  return `${activityDate(from)} → ${activityDate(to)}`;
}
