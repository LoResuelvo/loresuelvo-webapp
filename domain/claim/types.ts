export type ClaimReason = "non_compliance" | "improper_charge" | "damage" | "poor_quality";
export type ClaimStatus = "open" | "in_review" | "resolved" | "dismissed";
export type ClaimReference =
  | { readonly kind: "job_request" | "service_proposal" | "work_order"; readonly id: number }
  | { readonly kind: "payment_intent"; readonly id: string };
export interface ClaimSubmission {
  readonly reference: ClaimReference;
  readonly reason: ClaimReason;
  readonly description: string;
  readonly imageFileIds: string[];
}
export interface ClaimAcknowledgment {
  readonly id: number;
  readonly operationId: string;
  readonly reference: ClaimReference;
  readonly status: ClaimStatus;
  readonly createdOn: string;
}
export interface ClaimReferenceOption {
  readonly value: string;
  readonly label: string;
  readonly reference: ClaimReference;
}

export interface ClaimSummary extends ClaimAcknowledgment {
  readonly reason: ClaimReason;
  readonly reviewStartedOn: string | null;
  readonly closedOn: string | null;
}

export interface ClaimListCriteria {
  readonly status?: ClaimStatus;
  readonly page?: number;
  readonly limit?: number;
}

export interface ClaimPage {
  readonly items: ClaimSummary[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
}

export interface ClaimResolution {
  readonly type: "consumer_favor" | "provider_favor" | "agreement" | "without_merit";
  readonly reasoning: string;
  readonly resolvedOn: string;
  readonly suggestedCompensation: { readonly amountMinor: number; readonly currency: "ARS"; readonly unit: "minor" } | null;
}
export interface ClaimDetail extends ClaimSummary {
  readonly description: string;
  readonly images: { readonly fileId: string; readonly url: string }[];
  readonly resolution: ClaimResolution | null;
}
