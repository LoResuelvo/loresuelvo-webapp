import type { ActivityChange, ActivityComparison, ActivityInterval, ActivityPeriod, ActivityResults, ProviderActivity } from "@/domain/provider/activity";
import { activityInstant } from "@/domain/provider/activity-query";

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Invalid activity object");
  return value as Record<string, unknown>;
}

function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("Invalid activity count");
  return value;
}

function instant(value: unknown): string {
  activityInstant(value);
  if (typeof value !== "string") throw new Error("Invalid activity instant");
  return value;
}

function bounds(value: unknown): { from: string; to: string } {
  const source = record(value);
  const from = instant(source.from);
  const to = instant(source.to);
  if (Date.parse(from) >= Date.parse(to)) throw new Error("Invalid activity bounds");
  return { from, to };
}

function period(value: unknown): ActivityPeriod {
  const source = record(value);
  const granularity = source.granularity;
  if (granularity !== "day" && granularity !== "week" && granularity !== "month") throw new Error("Invalid granularity");
  if (source.time_zone !== "America/Argentina/Buenos_Aires") throw new Error("Invalid time zone");
  return { ...bounds(source), granularity, timeZone: source.time_zone };
}

function results(value: unknown): ActivityResults {
  const source = record(value);
  if (source.currency !== "ARS") throw new Error("Invalid currency");
  return {
    confirmedBookings: count(source.confirmed_bookings),
    reportedCompletions: count(source.reported_completions),
    fullyPaidWorkOrders: count(source.fully_paid_work_orders),
    clientsServed: count(source.clients_served),
    newClients: count(source.new_clients),
    returningClients: count(source.returning_clients),
    agreedValueCents: count(source.agreed_value_cents),
    averageValueCents: source.average_value_cents === null ? null : count(source.average_value_cents),
    currency: source.currency,
  };
}

function interval(value: unknown): ActivityInterval {
  const source = record(value);
  return { ...bounds(source), confirmedBookings: count(source.confirmed_bookings), reportedCompletions: count(source.reported_completions), fullyPaidWorkOrders: count(source.fully_paid_work_orders) };
}

function change(value: unknown, base: number | null, current: number | null): ActivityChange {
  const source = record(value);
  const absolute = source.absolute;
  const percentage = source.percentage;
  if (absolute !== null && (typeof absolute !== "number" || !Number.isSafeInteger(absolute))) throw new Error("Invalid absolute change");
  if (percentage !== null && (typeof percentage !== "number" || !Number.isFinite(percentage))) throw new Error("Invalid percentage change");
  if ((base === null || current === null) && (absolute !== null || percentage !== null)) throw new Error("Unavailable change");
  if (base !== null && current !== null && absolute === null) throw new Error("Missing absolute change");
  if (base === 0 && percentage !== null) throw new Error("Percentage without base");
  if (base !== null && base > 0 && current !== null && percentage === null) throw new Error("Missing percentage change");
  return { absolute, percentage };
}

function comparison(value: unknown, currentPeriod: ActivityPeriod, current: ActivityResults): ActivityComparison {
  const source = record(value);
  const previousPeriod = period(source.period);
  const previous = results(source.results);
  const changes = record(source.changes);
  const duration = Date.parse(currentPeriod.to) - Date.parse(currentPeriod.from);
  if (Date.parse(previousPeriod.to) !== Date.parse(currentPeriod.from) || Date.parse(previousPeriod.to) - Date.parse(previousPeriod.from) !== duration || previousPeriod.granularity !== currentPeriod.granularity) throw new Error("Invalid comparison period");
  return { period: previousPeriod, results: previous, changes: {
    confirmedBookings: change(changes.confirmed_bookings, previous.confirmedBookings, current.confirmedBookings),
    reportedCompletions: change(changes.reported_completions, previous.reportedCompletions, current.reportedCompletions),
    fullyPaidWorkOrders: change(changes.fully_paid_work_orders, previous.fullyPaidWorkOrders, current.fullyPaidWorkOrders),
    clientsServed: change(changes.clients_served, previous.clientsServed, current.clientsServed),
    newClients: change(changes.new_clients, previous.newClients, current.newClients),
    returningClients: change(changes.returning_clients, previous.returningClients, current.returningClients),
    agreedValueCents: change(changes.agreed_value_cents, previous.agreedValueCents, current.agreedValueCents),
    averageValueCents: change(changes.average_value_cents, previous.averageValueCents, current.averageValueCents),
  } };
}

export function mapProviderActivity(value: unknown): ProviderActivity {
  const source = record(value);
  const pending = record(source.current_pending);
  if (!Array.isArray(source.evolution)) throw new Error("Invalid evolution");
  const effectivePeriod = period(source.period);
  const currentResults = results(source.results);
  const evolution = source.evolution.map(interval);
  for (const [index, bucket] of evolution.entries()) {
    const expectedFrom = index === 0 ? effectivePeriod.from : evolution[index - 1].to;
    if (Date.parse(bucket.from) !== Date.parse(expectedFrom) || Date.parse(bucket.to) > Date.parse(effectivePeriod.to)) throw new Error("Invalid evolution bounds");
  }
  if (!evolution.length || Date.parse(evolution[evolution.length - 1].to) !== Date.parse(effectivePeriod.to)) throw new Error("Incomplete evolution");
  return {
    period: effectivePeriod,
    calculatedAt: instant(source.calculated_at),
    results: currentResults,
    evolution,
    currentPending: { requests: count(pending.requests), scheduledOrders: count(pending.scheduled_orders), awaitingPaymentOrders: count(pending.awaiting_payment_orders) },
    ...(source.comparison !== undefined ? { comparison: comparison(source.comparison, effectivePeriod, currentResults) } : {}),
  };
}
