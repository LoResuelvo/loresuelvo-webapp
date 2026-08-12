"use server";

import { createBookingDepositCheckout } from "@/application/payments/create-booking-deposit-checkout";
import { getPaymentIntent } from "@/application/payments/get-payment-intent";
import type { CheckoutSession, PaymentIntent } from "@/domain/payment/types";
import { ApiClientError } from "@/infrastructure/api/base-client";
import { ApiPaymentRepository } from "@/infrastructure/repositories/api-payment-repository";

export type CreateBookingDepositCheckoutResult =
  | { ok: true; checkout: CheckoutSession }
  | { ok: false; status: number | null };

export type GetPaymentIntentResult =
  | { ok: true; paymentIntent: PaymentIntent }
  | { ok: false; status: number | null };

export async function createBookingDepositCheckoutAction(
  serviceProposalId: number,
): Promise<CreateBookingDepositCheckoutResult> {
  try {
    const repository = new ApiPaymentRepository();
    const checkout = await createBookingDepositCheckout(repository, serviceProposalId);
    return { ok: true, checkout };
  } catch (error: unknown) {
    return {
      ok: false,
      status: error instanceof ApiClientError ? error.status : null,
    };
  }
}

export async function getPaymentIntentAction(
  paymentIntentId: string,
): Promise<GetPaymentIntentResult> {
  try {
    const repository = new ApiPaymentRepository();
    const paymentIntent = await getPaymentIntent(repository, paymentIntentId);
    return { ok: true, paymentIntent };
  } catch (error: unknown) {
    return {
      ok: false,
      status: error instanceof ApiClientError ? error.status : null,
    };
  }
}
