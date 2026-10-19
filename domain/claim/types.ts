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
