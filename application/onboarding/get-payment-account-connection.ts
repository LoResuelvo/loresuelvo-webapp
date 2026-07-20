import { PaymentAccountRepository } from "@/ports/payment-account-repository";
import { PaymentAccountConnection } from "@/domain/payment-account/types";

export async function getPaymentAccountConnection(
  paymentAccountRepository: PaymentAccountRepository
): Promise<PaymentAccountConnection> {
  return paymentAccountRepository.getConnection();
}
