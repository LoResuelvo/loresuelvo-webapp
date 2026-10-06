import type { ApiProviderConversion } from "../../infrastructure/api/types";
export {
  assertText,
  assertSituationCounts,
  assertSituationPercentage,
  assertNoZeroConversion,
  assertNoTemporalEvolution,
  assertFailedRangeError,
  assertErrorNotZeroConversion,
  fillDateRange,
} from "./conversion-assertions";

export function aConversionResponse(): ApiProviderConversion {
  return {
    period: {
      from: "2026-08-01T00:00:00-03:00",
      to: "2026-08-31T00:00:00-03:00",
      time_zone: "America/Argentina/Buenos_Aires",
    },
    observed_at: "2026-09-15T10:30:00-03:00",
    proposals: {
      stages: { issued: 10, contracted: 6, reported: 4, paid: 2 },
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
      acceptance_rate: { numerator: 10, denominator: 15, percentage: 66.67 },
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
      stages: { issued: 20, contracted: 12, reported: 8, paid: 4 },
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

export function aLatePreviousConversionResponse(): ApiProviderConversion {
  const base = aConversionResponse();
  return {
    ...base,
    period: {
      from: "2026-05-01T00:00:00-03:00",
      to: "2026-06-01T00:00:00-03:00",
      time_zone: "America/Argentina/Buenos_Aires",
    },
    proposals: {
      ...base.proposals,
      stages: { issued: 15, contracted: 9, reported: 5, paid: 1 },
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
      stages: { issued: 0, contracted: 0, reported: 0, paid: 0 },
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
      acceptance_rate: { numerator: 6, denominator: 8, percentage: 75 },
    },
  };
}

export function anEmptyCohortAndRequestsResponse(): ApiProviderConversion {
  return {
    ...anEmptyFunnelWithRequestsResponse(),
    requests: {
      received: 0,
      accepted: 0,
      pending: 0,
      acceptance_rate: { numerator: 0, denominator: 0, percentage: null },
    },
  };
}

export function anIssuedWithoutContractedResponse(): ApiProviderConversion {
  const base = aConversionResponse();
  return {
    ...base,
    proposals: {
      stages: { issued: 10, contracted: 0, reported: 0, paid: 0 },
      rates: {
        contracted: {
          cohort: { numerator: 0, denominator: 10, percentage: 0 },
          previous_stage: { numerator: 0, denominator: 10, percentage: 0 },
        },
        reported: {
          cohort: { numerator: 0, denominator: 10, percentage: 0 },
          previous_stage: { numerator: 0, denominator: 0, percentage: null },
        },
        paid: {
          cohort: { numerator: 0, denominator: 10, percentage: 0 },
          previous_stage: { numerator: 0, denominator: 0, percentage: null },
        },
      },
      uncontracted: 10,
    },
  };
}

export function aRequestsWithoutAcceptanceResponse(): ApiProviderConversion {
  const base = aConversionResponse();
  return {
    ...base,
    requests: {
      received: 5,
      accepted: 0,
      pending: 5,
      acceptance_rate: { numerator: 0, denominator: 5, percentage: 0 },
    },
  };
}

export function getSituationResponse(situacion: string): ApiProviderConversion {
  const responses: Record<string, () => ApiProviderConversion> = {
    "una cohorte y solicitudes vacías": anEmptyCohortAndRequestsResponse,
    "propuestas emitidas sin contrataciones": anIssuedWithoutContractedResponse,
    "solicitudes recibidas sin aceptaciones": aRequestsWithoutAcceptanceResponse,
  };
  const factory = responses[situacion.trim()];
  if (!factory) throw new Error(`Unsupported situation: ${situacion}`);
  return factory();
}

export const CONVERSION_TEST_RANGES: Record<string, [string, string]> = {
  incompleto: ["", "2026-08-15"],
  invertido: ["2026-08-20", "2026-08-10"],
  "mayor a 365 días": ["2025-01-01", "2026-01-02"],
  "con una fecha futura": ["2026-08-01", "2099-01-01"],
};
