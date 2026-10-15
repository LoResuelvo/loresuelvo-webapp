import { describe, expect, it } from "vitest";
import { mapProviderConversion } from "./conversion-mapper";

const validRaw = {
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

describe("conversion-mapper", () => {
  it("maps valid snake_case payload to domain model with camelCase", () => {
    const result = mapProviderConversion(validRaw);

    expect(result.period.from).toBe("2026-08-01T00:00:00-03:00");
    expect(result.period.to).toBe("2026-08-31T00:00:00-03:00");
    expect(result.period.timeZone).toBe("America/Argentina/Buenos_Aires");
    expect(result.observedAt).toBe("2026-09-15T10:30:00-03:00");

    expect(result.proposals.stages.issued).toBe(10);
    expect(result.proposals.stages.contracted).toBe(6);
    expect(result.proposals.stages.reported).toBe(4);
    expect(result.proposals.stages.paid).toBe(2);

    expect(result.proposals.rates.contracted.cohort).toEqual({
      numerator: 6,
      denominator: 10,
      percentage: 60,
    });
    expect(result.proposals.rates.contracted.previousStage).toEqual({
      numerator: 6,
      denominator: 10,
      percentage: 60,
    });
    expect(result.proposals.uncontracted).toBe(4);

    expect(result.requests.received).toBe(15);
    expect(result.requests.accepted).toBe(10);
    expect(result.requests.pending).toBe(2);
    expect(result.requests.acceptanceRate).toEqual({
      numerator: 10,
      denominator: 15,
      percentage: 66.67,
    });
  });

  it("handles null percentages correctly", () => {
    const rawWithNull = {
      ...validRaw,
      proposals: {
        ...validRaw.proposals,
        rates: {
          ...validRaw.proposals.rates,
          contracted: {
            cohort: { numerator: 0, denominator: 0, percentage: null },
            previous_stage: { numerator: 0, denominator: 0, percentage: null },
          },
        },
      },
    };

    const result = mapProviderConversion(rawWithNull);
    expect(result.proposals.rates.contracted.cohort.percentage).toBeNull();
    expect(result.proposals.rates.contracted.previousStage.percentage).toBeNull();
  });

  it("throws on non-object payload", () => {
    expect(() => mapProviderConversion(null)).toThrow("Invalid conversion payload");
    expect(() => mapProviderConversion("invalid")).toThrow("Invalid conversion payload");
  });

  it("throws on invalid integer counts", () => {
    const invalid = {
      ...validRaw,
      proposals: {
        ...validRaw.proposals,
        stages: { ...validRaw.proposals.stages, issued: -1 },
      },
    };
    expect(() => mapProviderConversion(invalid)).toThrow("Invalid count");
  });

  it("throws on invalid ISO date", () => {
    const invalid = {
      ...validRaw,
      observed_at: "not-a-date",
    };
    expect(() => mapProviderConversion(invalid)).toThrow("Invalid instant");
  });

  it("throws on invalid percentage", () => {
    const invalid = {
      ...validRaw,
      proposals: {
        ...validRaw.proposals,
        rates: {
          ...validRaw.proposals.rates,
          contracted: {
            cohort: { numerator: 6, denominator: 10, percentage: 150 },
            previous_stage: { numerator: 6, denominator: 10, percentage: 60 },
          },
        },
      },
    };
    expect(() => mapProviderConversion(invalid)).toThrow("Invalid percentage");
  });

  it("requires explicit null for unavailable percentages", () => {
    const invalid = {
      ...validRaw,
      proposals: {
        ...validRaw.proposals,
        rates: {
          ...validRaw.proposals.rates,
          contracted: {
            cohort: { numerator: 0, denominator: 0, percentage: undefined },
            previous_stage: { numerator: 0, denominator: 0, percentage: null },
          },
        },
      },
    };
    expect(() => mapProviderConversion(invalid)).toThrow("Invalid percentage");
  });

  it("rejects malformed, reversed or unzoned conversion response periods", () => {
    expect(() => mapProviderConversion({
      ...validRaw,
      period: { ...validRaw.period, time_zone: "UTC" },
    })).toThrow("Invalid timeZone for period");
    expect(() => mapProviderConversion({
      ...validRaw,
      period: { ...validRaw.period, from: "2026-08-01T00:00:00" },
    })).toThrow("Invalid instant for period.from");
    expect(() => mapProviderConversion({
      ...validRaw,
      period: {
        ...validRaw.period,
        from: "2026-08-01T00:00:00.000000001Z",
        to: "2026-08-01T00:00:00.000000000Z",
      },
    })).toThrow("Invalid conversion period bounds");
  });
});
