export type CollectionPurpose = "booking_deposit" | "service_balance";
export interface CollectionTransaction {
  readonly id: number;
  readonly verifiedOn: string;
  readonly purpose: CollectionPurpose;
  readonly sellerAmountCents: number;
  readonly currency: "ARS";
  readonly serviceProposalId: number;
  readonly workOrderId: number;
}
export interface CollectionTransactions {
  readonly period: { readonly from: string; readonly to: string; readonly timeZone: "America/Argentina/Buenos_Aires" };
  readonly calculatedAt: string;
  readonly currency: "ARS";
  readonly totalCount: number;
  readonly totalAmountCents: number;
  readonly transactions: readonly CollectionTransaction[];
  readonly nextCursor: string | null;
}
