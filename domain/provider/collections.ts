import type { StatisticsPeriod } from "./statistics-period";

export interface CollectionAmounts {
  readonly bookingDepositCents: number;
  readonly serviceBalanceCents: number;
  readonly totalCents: number;
}
export interface ProviderCollections {
  readonly period: StatisticsPeriod;
  readonly calculatedAt: string;
  readonly currency: "ARS";
  readonly results: CollectionAmounts;
  readonly evolution: readonly (CollectionAmounts & { readonly from: string; readonly to: string })[];
  readonly comparison?: CollectionComparison;
  readonly currentPending: {
    readonly scheduled: { readonly orders: number; readonly amountCents: number };
    readonly awaitingPayment: { readonly orders: number; readonly amountCents: number };
  };
}

export interface CollectionComparison {
  readonly period: StatisticsPeriod;
  readonly results: CollectionAmounts;
  readonly changes: { readonly [K in keyof CollectionAmounts]: { readonly absolute: number; readonly percentage: number | null } };
}
