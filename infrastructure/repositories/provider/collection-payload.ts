import { statisticsInstant } from "@/domain/provider/statistics-query";

export function collectionRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Invalid collection object");
  return value as Record<string, unknown>;
}
export function collectionCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("Invalid collection amount or count");
  return value;
}
export function collectionInstant(value: unknown): string {
  statisticsInstant(value);
  if (typeof value !== "string") throw new Error("Invalid collection instant");
  return value;
}
function instantParts(value: string) {
  const milliseconds = statisticsInstant(value);
  return { seconds: Math.floor(milliseconds / 1000), fraction: /\.(\d+)(?:Z|[+-]\d{2}:\d{2})$/.exec(value)?.[1] ?? "" };
}
function fractionOrder(left: string, right: string): number {
  const length = Math.max(left.length, right.length);
  const a = left.padEnd(length, "0"), b = right.padEnd(length, "0");
  return a === b ? 0 : a < b ? -1 : 1;
}
// RFC3339Nano ordering must retain fractions that JavaScript Date discards.
export function collectionInstantOrder(left: string, right: string): number {
  const a = instantParts(left), b = instantParts(right);
  if (a.seconds !== b.seconds) return a.seconds < b.seconds ? -1 : 1;
  return fractionOrder(a.fraction, b.fraction);
}
export function collectionPeriodsHaveEqualDuration(left: { from: string; to: string }, right: { from: string; to: string }): boolean {
  const parts = [left.from, left.to, right.from, right.to].map(instantParts);
  const precision = Math.max(...parts.map(part => part.fraction.length));
  const scale = BigInt(10) ** BigInt(precision);
  const instants = parts.map(part => BigInt(part.seconds) * scale + BigInt(part.fraction.padEnd(precision, "0") || "0"));
  return instants[1] - instants[0] === instants[3] - instants[2];
}
function exceedsYear(from: string, to: string): boolean {
  const a = instantParts(from), b = instantParts(to);
  const seconds = b.seconds - a.seconds, maximum = 365 * 86400;
  return seconds > maximum || (seconds === maximum && fractionOrder(b.fraction, a.fraction) > 0);
}
export function collectionBounds(value: unknown): { from: string; to: string } {
  const source = collectionRecord(value);
  const from = collectionInstant(source.from), to = collectionInstant(source.to);
  if (collectionInstantOrder(from, to) >= 0 || exceedsYear(from, to)) throw new Error("Invalid collection bounds");
  return { from, to };
}
