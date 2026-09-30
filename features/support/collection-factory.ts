import type { ApiProviderCollections, ApiCollectionTransactions } from "../../infrastructure/api/types";

export function aCollectionResponse(): ApiProviderCollections {
  return {
    period: { from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00", granularity: "day", time_zone: "America/Argentina/Buenos_Aires" },
    calculated_at: "2026-08-31T00:00:00-03:00", currency: "ARS",
    results: { booking_deposit_cents: 1200001, service_balance_cents: 2800002, total_cents: 4000003 },
    evolution: Array.from({ length: 30 }, (_, index) => ({
      from: `${new Date(Date.UTC(2026, 7, 1 + index)).toISOString().slice(0, 10)}T00:00:00-03:00`,
      to: `${new Date(Date.UTC(2026, 7, 2 + index)).toISOString().slice(0, 10)}T00:00:00-03:00`,
      booking_deposit_cents: index === 0 ? 1200001 : 0,
      service_balance_cents: index === 0 ? 2800002 : 0,
      total_cents: index === 0 ? 4000003 : 0,
    })),
    current_pending: { scheduled: { orders: 3, amount_cents: 3000000 }, awaiting_payment: { orders: 2, amount_cents: 1500000 } },
  };
}

export function aComparedCollectionResponse(): ApiProviderCollections {
  const response = aCollectionResponse();
  response.period = { ...response.period, from: "2026-08-04T00:00:00-03:00", to: "2026-09-13T00:00:00-03:00", granularity: "month" };
  response.results = { booking_deposit_cents: 1000000, service_balance_cents: 2000000, total_cents: 3000000 };
  response.evolution = [
    { ...response.results, from: response.period.from, to: "2026-09-01T00:00:00-03:00" },
    { booking_deposit_cents: 0, service_balance_cents: 0, total_cents: 0, from: "2026-09-01T00:00:00-03:00", to: response.period.to },
  ];
  response.comparison = {
    period: { ...response.period, from: "2026-06-25T00:00:00-03:00", to: response.period.from },
    results: { booking_deposit_cents: 0, service_balance_cents: 4000000, total_cents: 4000000 },
    changes: { booking_deposit_cents: { absolute: 1000000, percentage: null }, service_balance_cents: { absolute: -2000000, percentage: -50 }, total_cents: { absolute: -1000000, percentage: -25 } },
  };
  return response;
}

export function aCollectionTransactionsResponse(purpose?: "booking_deposit" | "service_balance"): ApiCollectionTransactions {
  const transactions = [
    { id: 101, verified_on: "2026-08-20T12:00:00-03:00", purpose: "booking_deposit" as const, seller_amount_cents: 500001, currency: "ARS" as const, service_proposal_id: 41, work_order_id: 51 },
    { id: 100, verified_on: "2026-08-19T12:00:00-03:00", purpose: "service_balance" as const, seller_amount_cents: 900002, currency: "ARS" as const, service_proposal_id: 42, work_order_id: 52 },
  ];
  return {
    period: { from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00", time_zone: "America/Argentina/Buenos_Aires" },
    calculated_at: "2026-08-31T00:00:00-03:00", currency: "ARS",
    total_count: purpose ? 23 : 30, total_amount_cents: purpose ? 1200001 : 4000003,
    transactions: purpose ? transactions.filter(transaction => transaction.purpose === purpose) : transactions,
    next_cursor: "opaque-signed-cursor",
  };
}

export function aNextCollectionTransactionsResponse(purpose?: "booking_deposit" | "service_balance"): ApiCollectionTransactions {
  const transactions = [
    { id: 99, verified_on: "2026-08-18T12:00:00-03:00", purpose: "booking_deposit" as const, seller_amount_cents: 400000, currency: "ARS" as const, service_proposal_id: 43, work_order_id: 53 },
    { id: 98, verified_on: "2026-08-17T12:00:00-03:00", purpose: "service_balance" as const, seller_amount_cents: 800000, currency: "ARS" as const, service_proposal_id: 44, work_order_id: 54 },
  ];
  return {
    period: { from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00", time_zone: "America/Argentina/Buenos_Aires" },
    calculated_at: "2026-08-31T00:00:00-03:00", currency: "ARS",
    total_count: purpose ? 23 : 30, total_amount_cents: purpose ? 1200001 : 4000003,
    transactions: purpose ? transactions.filter(transaction => transaction.purpose === purpose) : transactions,
    next_cursor: null,
  };
}

export function anEmptyCollectionResponse(): ApiProviderCollections {
  return {
    period: { from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00", granularity: "day", time_zone: "America/Argentina/Buenos_Aires" },
    calculated_at: "2026-08-31T00:00:00-03:00", currency: "ARS",
    results: { booking_deposit_cents: 0, service_balance_cents: 0, total_cents: 0 },
    evolution: Array.from({ length: 30 }, (_, index) => ({
      from: `${new Date(Date.UTC(2026, 7, 1 + index)).toISOString().slice(0, 10)}T00:00:00-03:00`,
      to: `${new Date(Date.UTC(2026, 7, 2 + index)).toISOString().slice(0, 10)}T00:00:00-03:00`,
      booking_deposit_cents: 0,
      service_balance_cents: 0,
      total_cents: 0,
    })),
    current_pending: { scheduled: { orders: 0, amount_cents: 0 }, awaiting_payment: { orders: 1, amount_cents: 1500000 } },
  };
}

export function anEmptyCollectionTransactionsResponse(): ApiCollectionTransactions {
  return {
    period: { from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00", time_zone: "America/Argentina/Buenos_Aires" },
    calculated_at: "2026-08-31T00:00:00-03:00", currency: "ARS",
    total_count: 0, total_amount_cents: 0,
    transactions: [],
    next_cursor: null,
  };
}
