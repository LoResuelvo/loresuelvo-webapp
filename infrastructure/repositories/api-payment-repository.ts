import { api } from "@/infrastructure/api/base-client";
import type {
  ApiCheckoutSession,
  ApiPaymentIntent,
  ApiServiceBalanceCheckoutSession,
} from "@/infrastructure/api/types";
import type { CheckoutSession, PaymentIntent } from "@/domain/payment/types";
import type { PaymentRepository } from "@/ports/payment-repository";
import {
  mapApiCheckoutSession,
  mapApiPaymentIntent,
  mapApiServiceBalanceCheckoutSession,
} from "./payment-mapper";

export class ApiPaymentRepository implements PaymentRepository {
  async createCheckoutSession(serviceProposalId: number): Promise<CheckoutSession> {
    const response = await api.post<ApiCheckoutSession>(
      `/service-proposals/${serviceProposalId}/checkout-sessions`,
      {},
    );

    return mapApiCheckoutSession(response);
  }

  async createServiceBalanceCheckout(workOrderId: number): Promise<CheckoutSession> {
    const response = await api.post<ApiServiceBalanceCheckoutSession>(
      `/work-orders/${workOrderId}/checkout-sessions`,
      {},
    );

    return mapApiServiceBalanceCheckoutSession(response);
  }

  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    const response = await api.get<ApiPaymentIntent>(
      `/payment-intents/${paymentIntentId}`,
    );

    return mapApiPaymentIntent(paymentIntentId, response);
  }
}
