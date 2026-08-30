import { PaymentAccountRepository } from "@/ports/payments/payment-account-repository";

export async function startMercadoPagoConnection(
  paymentAccountRepository: PaymentAccountRepository
): Promise<{ authorizationUrl: string }> {
  const authorization = await paymentAccountRepository.startAuthorization();
  return { authorizationUrl: authorization.authorizationUrl };
}
