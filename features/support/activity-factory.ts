import type { ApiProviderActivity } from "../../infrastructure/api/types";

export function anActivityResponse(): ApiProviderActivity {
  return {
    period: { from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00", granularity: "day", time_zone: "America/Argentina/Buenos_Aires" },
    calculated_at: "2026-08-31T00:00:00-03:00",
    results: { confirmed_bookings: 4, reported_completions: 3, fully_paid_work_orders: 2, clients_served: 3, new_clients: 2, returning_clients: 1, agreed_value_cents: 12000000, average_value_cents: 4000000, currency: "ARS" },
    evolution: Array.from({ length: 30 }, (_, index) => ({
      from: `${new Date(Date.UTC(2026, 7, 1 + index)).toISOString().slice(0, 10)}T00:00:00-03:00`,
      to: `${new Date(Date.UTC(2026, 7, 2 + index)).toISOString().slice(0, 10)}T00:00:00-03:00`,
      confirmed_bookings: index === 0 ? 4 : 0,
      reported_completions: index === 0 ? 3 : 0,
      fully_paid_work_orders: index === 0 ? 2 : 0,
    })),
    current_pending: { requests: 7, scheduled_orders: 8, awaiting_payment_orders: 9 },
  };
}

export function aWeeklyActivityResponse(): ApiProviderActivity {
  const response = anActivityResponse();
  response.period = { ...response.period, from: "2026-08-04T00:00:00-03:00", to: "2026-08-13T00:00:00-03:00", granularity: "week" };
  response.results.confirmed_bookings = 6;
  response.evolution = [
    { from: response.period.from, to: "2026-08-10T00:00:00-03:00", confirmed_bookings: 6, reported_completions: 3, fully_paid_work_orders: 2 },
    { from: "2026-08-10T00:00:00-03:00", to: response.period.to, confirmed_bookings: 0, reported_completions: 0, fully_paid_work_orders: 0 },
  ];
  return response;
}

export function aComparedActivityResponse(): ApiProviderActivity {
  const response = anActivityResponse();
  const previous = { ...response.results, confirmed_bookings: 0, reported_completions: 1, fully_paid_work_orders: 2, agreed_value_cents: 8000000, average_value_cents: 8000000 };
  response.comparison = {
    period: { ...response.period, from: "2026-07-02T00:00:00-03:00", to: response.period.from },
    results: previous,
    changes: {
      confirmed_bookings: { absolute: 4, percentage: null },
      reported_completions: { absolute: 2, percentage: 200 },
      fully_paid_work_orders: { absolute: 0, percentage: 0 },
      clients_served: { absolute: 0, percentage: 0 },
      new_clients: { absolute: 0, percentage: 0 },
      returning_clients: { absolute: 0, percentage: 0 },
      agreed_value_cents: { absolute: 4000000, percentage: 50 },
      average_value_cents: { absolute: -4000000, percentage: -50 },
    },
  };
  return response;
}
