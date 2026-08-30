import type { CheckoutSession } from "@/domain/payment/types";
import type { PaymentRepository } from "@/ports/payments/payment-repository";

export async function createServiceBalanceCheckout(
  repository: PaymentRepository,
  workOrderId: number,
): Promise<CheckoutSession> {
  return repository.createServiceBalanceCheckout(workOrderId);
}
