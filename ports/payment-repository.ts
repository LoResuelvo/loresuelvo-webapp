import type { CheckoutSession, PaymentIntent } from "@/domain/payment/types";

export interface PaymentRepository {
  createCheckoutSession(serviceProposalId: number): Promise<CheckoutSession>;
  getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent>;
}
