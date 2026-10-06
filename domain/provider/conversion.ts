export interface ConversionRatio {
  readonly numerator: number;
  readonly denominator: number;
  readonly percentage: number | null;
}

export interface ConversionStageRates {
  readonly cohort: ConversionRatio;
  readonly previousStage: ConversionRatio;
}

export interface ConversionStages {
  readonly issued: number;
  readonly contracted: number;
  readonly reported: number;
  readonly paid: number;
}

export interface ConversionProposals {
  readonly stages: ConversionStages;
  readonly rates: {
    readonly contracted: ConversionStageRates;
    readonly reported: ConversionStageRates;
    readonly paid: ConversionStageRates;
  };
  readonly uncontracted: number;
}

export interface ConversionRequests {
  readonly received: number;
  readonly accepted: number;
  readonly pending: number;
  readonly acceptanceRate: ConversionRatio;
}

export interface ProviderConversion {
  readonly period: {
    readonly from: string;
    readonly to: string;
    readonly timeZone: string;
  };
  readonly observedAt: string;
  readonly proposals: ConversionProposals;
  readonly requests: ConversionRequests;
}
