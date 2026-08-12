import type { CheckoutSession } from "@/domain/payment/types";
import type { PaymentRepository } from "@/ports/payment-repository";

export async function createBookingDepositCheckout(
  repository: PaymentRepository,
  serviceProposalId: number,
): Promise<CheckoutSession> {
  return repository.createCheckoutSession(serviceProposalId);
}
