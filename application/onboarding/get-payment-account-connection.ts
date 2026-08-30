import { PaymentAccountRepository } from "@/ports/payments/payment-account-repository";
import { PaymentAccountConnection } from "@/domain/payment-account/types";

export async function getPaymentAccountConnection(
  paymentAccountRepository: PaymentAccountRepository
): Promise<PaymentAccountConnection> {
  return paymentAccountRepository.getConnection();
}
