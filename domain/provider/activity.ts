export type ActivityGranularity = "day" | "week" | "month";

export interface ActivityPeriod {
  readonly from: string;
  readonly to: string;
  readonly granularity: ActivityGranularity;
  readonly timeZone: "America/Argentina/Buenos_Aires";
}

export interface ActivityResults {
  readonly confirmedBookings: number;
  readonly reportedCompletions: number;
  readonly fullyPaidWorkOrders: number;
  readonly clientsServed: number;
  readonly newClients: number;
  readonly returningClients: number;
  readonly agreedValueCents: number;
  readonly averageValueCents: number | null;
  readonly currency: "ARS";
}

export interface ActivityInterval {
  readonly from: string;
  readonly to: string;
  readonly confirmedBookings: number;
  readonly reportedCompletions: number;
  readonly fullyPaidWorkOrders: number;
}

export interface ProviderActivity {
  readonly period: ActivityPeriod;
  readonly calculatedAt: string;
  readonly results: ActivityResults;
  readonly evolution: readonly ActivityInterval[];
  readonly currentPending: {
    requests: number;
    scheduledOrders: number;
    awaitingPaymentOrders: number;
  };
  readonly comparison?: ActivityComparison;
}

export type ActivityMetric = Exclude<keyof ActivityResults, "currency">;
export interface ActivityChange {
  readonly absolute: number | null;
  readonly percentage: number | null;
}
export interface ActivityComparison {
  readonly period: ActivityPeriod;
  readonly results: ActivityResults;
  readonly changes: Record<ActivityMetric, ActivityChange>;
}
