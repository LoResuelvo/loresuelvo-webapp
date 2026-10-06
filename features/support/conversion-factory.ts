import type { ApiProviderConversion } from "../../infrastructure/api/types";

export function aConversionResponse(): ApiProviderConversion {
  return {
    period: {
      from: "2026-08-01T00:00:00-03:00",
      to: "2026-08-31T00:00:00-03:00",
      time_zone: "America/Argentina/Buenos_Aires",
    },
    observed_at: "2026-09-15T10:30:00-03:00",
    proposals: {
      stages: {
        issued: 10,
        contracted: 6,
        reported: 4,
        paid: 2,
      },
      rates: {
        contracted: {
          cohort: { numerator: 6, denominator: 10, percentage: 60 },
          previous_stage: { numerator: 6, denominator: 10, percentage: 60 },
        },
        reported: {
          cohort: { numerator: 4, denominator: 10, percentage: 40 },
          previous_stage: { numerator: 4, denominator: 6, percentage: 66.67 },
        },
        paid: {
          cohort: { numerator: 2, denominator: 10, percentage: 20 },
          previous_stage: { numerator: 2, denominator: 4, percentage: 50 },
        },
      },
      uncontracted: 4,
    },
    requests: {
      received: 15,
      accepted: 10,
      pending: 2,
      acceptance_rate: {
        numerator: 10,
        denominator: 15,
        percentage: 66.67,
      },
    },
  };
}

export function aFilteredConversionResponse(): ApiProviderConversion {
  const base = aConversionResponse();
  return {
    ...base,
    period: {
      from: "2026-06-01T00:00:00-03:00",
      to: "2026-07-01T00:00:00-03:00",
      time_zone: "America/Argentina/Buenos_Aires",
    },
    observed_at: "2026-07-15T10:30:00-03:00",
    proposals: {
      stages: {
        issued: 20,
        contracted: 12,
        reported: 8,
        paid: 4,
      },
      rates: {
        contracted: {
          cohort: { numerator: 12, denominator: 20, percentage: 60 },
          previous_stage: { numerator: 12, denominator: 20, percentage: 60 },
        },
        reported: {
          cohort: { numerator: 8, denominator: 20, percentage: 40 },
          previous_stage: { numerator: 8, denominator: 12, percentage: 66.67 },
        },
        paid: {
          cohort: { numerator: 4, denominator: 20, percentage: 20 },
          previous_stage: { numerator: 4, denominator: 8, percentage: 50 },
        },
      },
      uncontracted: 8,
    },
  };
}

export function anEmptyFunnelWithRequestsResponse(): ApiProviderConversion {
  return {
    period: {
      from: "2026-08-01T00:00:00-03:00",
      to: "2026-08-31T00:00:00-03:00",
      time_zone: "America/Argentina/Buenos_Aires",
    },
    observed_at: "2026-09-15T10:30:00-03:00",
    proposals: {
      stages: {
        issued: 0,
        contracted: 0,
        reported: 0,
        paid: 0,
      },
      rates: {
        contracted: {
          cohort: { numerator: 0, denominator: 0, percentage: null },
          previous_stage: { numerator: 0, denominator: 0, percentage: null },
        },
        reported: {
          cohort: { numerator: 0, denominator: 0, percentage: null },
          previous_stage: { numerator: 0, denominator: 0, percentage: null },
        },
        paid: {
          cohort: { numerator: 0, denominator: 0, percentage: null },
          previous_stage: { numerator: 0, denominator: 0, percentage: null },
        },
      },
      uncontracted: 0,
    },
    requests: {
      received: 8,
      accepted: 6,
      pending: 2,
      acceptance_rate: {
        numerator: 6,
        denominator: 8,
        percentage: 75,
      },
    },
  };
}
