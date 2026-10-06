import type {
  ConversionRatio,
  ConversionStageRates,
  ConversionStages,
  ConversionProposals,
  ConversionRequests,
  ProviderConversion,
} from "@/domain/provider/conversion";

function record(value: unknown, label: string = "conversion"): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Invalid ${label} payload`);
  }
  return value as Record<string, unknown>;
}

function count(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid count for ${fieldName}`);
  }
  return value;
}

function isoString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error(`Invalid instant for ${fieldName}`);
  }
  return value;
}

function percentage(value: unknown, fieldName: string): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`Invalid percentage for ${fieldName}`);
  }
  return value;
}

function mapRatio(value: unknown, fieldName: string): ConversionRatio {
  const rec = record(value, fieldName);
  return {
    numerator: count(rec.numerator, `${fieldName}.numerator`),
    denominator: count(rec.denominator, `${fieldName}.denominator`),
    percentage: percentage(rec.percentage, `${fieldName}.percentage`),
  };
}

function mapStageRates(value: unknown, stageName: string): ConversionStageRates {
  const rec = record(value, stageName);
  return {
    cohort: mapRatio(rec.cohort, `${stageName}.cohort`),
    previousStage: mapRatio(rec.previous_stage, `${stageName}.previous_stage`),
  };
}

function mapStages(value: unknown): ConversionStages {
  const rec = record(value, "proposals.stages");
  return {
    issued: count(rec.issued, "proposals.stages.issued"),
    contracted: count(rec.contracted, "proposals.stages.contracted"),
    reported: count(rec.reported, "proposals.stages.reported"),
    paid: count(rec.paid, "proposals.stages.paid"),
  };
}

function mapProposals(value: unknown): ConversionProposals {
  const rec = record(value, "proposals");
  const ratesRec = record(rec.rates, "proposals.rates");
  return {
    stages: mapStages(rec.stages),
    rates: {
      contracted: mapStageRates(ratesRec.contracted, "proposals.rates.contracted"),
      reported: mapStageRates(ratesRec.reported, "proposals.rates.reported"),
      paid: mapStageRates(ratesRec.paid, "proposals.rates.paid"),
    },
    uncontracted: count(rec.uncontracted, "proposals.uncontracted"),
  };
}

function mapRequests(value: unknown): ConversionRequests {
  const rec = record(value, "requests");
  return {
    received: count(rec.received, "requests.received"),
    accepted: count(rec.accepted, "requests.accepted"),
    pending: count(rec.pending, "requests.pending"),
    acceptanceRate: mapRatio(rec.acceptance_rate, "requests.acceptance_rate"),
  };
}

export function mapProviderConversion(raw: unknown): ProviderConversion {
  const root = record(raw, "conversion");
  const periodRec = record(root.period, "period");

  const timeZone = periodRec.time_zone;
  if (typeof timeZone !== "string" || timeZone.trim().length === 0) {
    throw new Error("Invalid timeZone for period");
  }

  return {
    period: {
      from: isoString(periodRec.from, "period.from"),
      to: isoString(periodRec.to, "period.to"),
      timeZone,
    },
    observedAt: isoString(root.observed_at, "observed_at"),
    proposals: mapProposals(root.proposals),
    requests: mapRequests(root.requests),
  };
}
