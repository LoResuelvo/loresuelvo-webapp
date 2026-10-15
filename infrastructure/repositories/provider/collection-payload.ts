import { statisticsInstant } from "@/domain/provider/statistics-query";
import {
  compareStatisticsInstants,
  statisticsInstantDurationExceeds,
  statisticsPeriodsHaveEqualDuration,
} from "@/domain/provider/statistics-instant";

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
export function collectionInstantOrder(left: string, right: string): number {
  return compareStatisticsInstants(left, right);
}
export function collectionPeriodsHaveEqualDuration(left: { from: string; to: string }, right: { from: string; to: string }): boolean {
  return statisticsPeriodsHaveEqualDuration(left, right);
}
function exceedsYear(from: string, to: string): boolean {
  return statisticsInstantDurationExceeds(from, to, 365 * 86400000);
}
export function collectionBounds(value: unknown): { from: string; to: string } {
  const source = collectionRecord(value);
  const from = collectionInstant(source.from), to = collectionInstant(source.to);
  if (collectionInstantOrder(from, to) >= 0 || exceedsYear(from, to)) throw new Error("Invalid collection bounds");
  return { from, to };
}
