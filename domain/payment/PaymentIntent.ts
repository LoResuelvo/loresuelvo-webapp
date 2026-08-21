import type { PaymentIntentStatus } from "./types";

function isTerminalStatus(status: PaymentIntentStatus): boolean {
  return status === "paid" || status === "rejected" || status === "expired";
}

function isPaid(status: PaymentIntentStatus): boolean {
  return status === "paid";
}

function isProcessing(status: PaymentIntentStatus): boolean {
  return status === "processing";
}

function isPending(status: PaymentIntentStatus): boolean {
  return status === "checkout_ready";
}

export const PaymentIntentModule = {
  isTerminalStatus,
  isPaid,
  isProcessing,
  isPending,
};

export const PaymentIntent = PaymentIntentModule;
