import type { ActivePayment, PaymentIntentStatus } from "@/domain/payment/types";
import { PaymentIntent } from "@/domain/payment/PaymentIntent";

export function parseActivePayment(value: string | null): ActivePayment | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("purpose" in parsed) ||
      parsed.purpose !== "booking_deposit" ||
      !("paymentIntentId" in parsed) ||
      typeof parsed.paymentIntentId !== "string" ||
      !("serviceProposalId" in parsed) ||
      typeof parsed.serviceProposalId !== "number" ||
      !("expiresOn" in parsed) ||
      typeof parsed.expiresOn !== "string"
    ) {
      return null;
    }

    return parsed as ActivePayment;
  } catch {
    return null;
  }
}

export function resolvePaymentIntentId(
  search: string,
  storedPaymentValue: string | null,
): string | null {
  const params = new URLSearchParams(search);
  const storedPayment = parseActivePayment(storedPaymentValue);
  return params.get("external_reference") ?? storedPayment?.paymentIntentId ?? null;
}

export function isTerminalPaymentStatus(status: PaymentIntentStatus): boolean {
  return PaymentIntent.isTerminalStatus(status);
}
