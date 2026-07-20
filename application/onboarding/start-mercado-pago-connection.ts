import { PaymentAccountRepository } from "@/ports/payment-account-repository";

export async function startMercadoPagoConnection(
  paymentAccountRepository: PaymentAccountRepository
): Promise<{ authorizationUrl: string }> {
  const authorization = await paymentAccountRepository.startAuthorization();
  return { authorizationUrl: authorization.authorizationUrl };
}
