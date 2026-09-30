import type { CollectionAmounts, CollectionComparison, ProviderCollections } from "@/domain/provider/collections";
import type { StatisticsPeriod } from "@/domain/provider/statistics-period";
import { collectionRecord as record, collectionCount as count, collectionInstant as instant, collectionBounds as bounds, collectionInstantOrder as instantOrder, collectionPeriodsHaveEqualDuration } from "./collection-payload";

function period(value: unknown): StatisticsPeriod {
  const source = record(value);
  const granularity = source.granularity;
  if (granularity !== "day" && granularity !== "week" && granularity !== "month") throw new Error("Invalid collection granularity");
  if (source.time_zone !== "America/Argentina/Buenos_Aires") throw new Error("Invalid collection time zone");
  return { ...bounds(source), granularity, timeZone: source.time_zone };
}
function amounts(value: unknown): CollectionAmounts {
  const source = record(value);
  return { bookingDepositCents: count(source.booking_deposit_cents), serviceBalanceCents: count(source.service_balance_cents), totalCents: count(source.total_cents) };
}
function pending(value: unknown) {
  const source = record(value);
  return { orders: count(source.orders), amountCents: count(source.amount_cents) };
}
function change(value: unknown, base: number) {
  const source = record(value);
  const absolute = source.absolute, percentage = source.percentage;
  if (typeof absolute !== "number" || !Number.isSafeInteger(absolute)) throw new Error("Invalid collection change");
  if (percentage !== null && (typeof percentage !== "number" || !Number.isFinite(percentage))) throw new Error("Invalid collection percentage");
  if ((base === 0 && percentage !== null) || (base > 0 && percentage === null)) throw new Error("Invalid collection percentage base");
  return { absolute, percentage };
}
function comparison(value: unknown, currentPeriod: StatisticsPeriod): CollectionComparison {
  const source = record(value);
  const previousPeriod = period(source.period), previousResults = amounts(source.results);
  const changes = record(source.changes);
  if (instantOrder(previousPeriod.to, currentPeriod.from) !== 0 || !collectionPeriodsHaveEqualDuration(previousPeriod, currentPeriod) || previousPeriod.granularity !== currentPeriod.granularity) throw new Error("Invalid collection comparison period");
  return { period: previousPeriod, results: previousResults, changes: {
    bookingDepositCents: change(changes.booking_deposit_cents, previousResults.bookingDepositCents),
    serviceBalanceCents: change(changes.service_balance_cents, previousResults.serviceBalanceCents),
    totalCents: change(changes.total_cents, previousResults.totalCents),
  } };
}
export function mapProviderCollections(value: unknown): ProviderCollections {
  const source = record(value);
  if (source.currency !== "ARS") throw new Error("Invalid collection currency");
  const effectivePeriod = period(source.period);
  if (!Array.isArray(source.evolution) || !source.evolution.length) throw new Error("Missing collection evolution");
  const evolution = source.evolution.map(value => ({ ...bounds(value), ...amounts(value) }));
  for (const [index, bucket] of evolution.entries()) {
    const expectedFrom = index === 0 ? effectivePeriod.from : evolution[index - 1].to;
    if (instantOrder(bucket.from, expectedFrom) !== 0 || instantOrder(bucket.to, effectivePeriod.to) > 0) throw new Error("Invalid collection chronology");
  }
  if (instantOrder(evolution[evolution.length - 1].to, effectivePeriod.to) !== 0) throw new Error("Incomplete collection evolution");
  const currentPending = record(source.current_pending);
  return { period: effectivePeriod, calculatedAt: instant(source.calculated_at), currency: source.currency,
    results: amounts(source.results), evolution,
    ...(source.comparison !== undefined ? { comparison: comparison(source.comparison, effectivePeriod) } : {}),
    currentPending: { scheduled: pending(currentPending.scheduled), awaitingPayment: pending(currentPending.awaiting_payment) },
  };
}
