export type PaymentIntentStatus =
  | "checkout_ready"
  | "processing"
  | "paid"
  | "rejected"
  | "expired";

export interface PaymentPricing {
  currency: string;
  depositCents: number;
  platformFeeDueNowCents: number;
  amountDueNowCents: number;
}

export interface CheckoutSession {
  paymentIntentId: string;
  status: "checkout_ready";
  checkoutUrl: string;
  expiresOn: string;
  pricing: PaymentPricing;
}

export interface PaymentIntent {
  paymentIntentId: string;
  status: PaymentIntentStatus;
}

export interface ActivePayment {
  purpose: "booking_deposit";
  paymentIntentId: string;
  serviceProposalId: number;
  expiresOn: string;
}
