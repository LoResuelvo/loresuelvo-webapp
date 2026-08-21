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

export interface BookingTerms {
  currency: "ARS";
  serviceTotalCents: number;
  depositCents: number;
  remainingServiceBalanceCents: number;
  platformFeeTotalCents: number;
  platformFeeDueNowCents: number;
  remainingPlatformFeeCents: number;
  amountDueNowCents: number;
  remainingAmountDueCents: number;
  contractTotalCents: number;
  bookingPaymentDeadline: string;
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

export type PaymentPurpose = "booking_deposit" | "service_balance";

export interface ActivePayment {
  purpose: PaymentPurpose;
  paymentIntentId: string;
  serviceProposalId?: number;
  workOrderId?: number;
  expiresOn: string;
}

export interface ServiceBalancePricing {
  currency: string;
  remainingServiceBalanceCents: number;
  remainingPlatformFeeCents: number;
  amountDueNowCents: number;
}
