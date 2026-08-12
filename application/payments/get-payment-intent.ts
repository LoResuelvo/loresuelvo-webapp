import type { PaymentIntent } from "@/domain/payment/types";
import type { PaymentRepository } from "@/ports/payment-repository";

export async function getPaymentIntent(
  repository: PaymentRepository,
  paymentIntentId: string,
): Promise<PaymentIntent> {
  return repository.getPaymentIntent(paymentIntentId);
}
