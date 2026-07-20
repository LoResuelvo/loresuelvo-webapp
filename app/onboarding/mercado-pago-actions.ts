"use server";

import { ApiPaymentAccountRepository } from "@/infrastructure/repositories/api-payment-account-repository";
import { startMercadoPagoConnection } from "@/application/onboarding/start-mercado-pago-connection";

export async function startMercadoPagoConnectionAction(): Promise<{ authorizationUrl: string }> {
  const repo = new ApiPaymentAccountRepository();
  return startMercadoPagoConnection(repo);
}
