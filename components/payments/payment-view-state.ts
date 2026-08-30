import { AlertTriangle, CheckCircle2, Clock3, XCircle, type LucideIcon } from "lucide-react";
import type { StatusVariant } from "./StatusBadge";
import type { PaymentReturnKind } from "./PaymentResultPage";
import type { ActivePayment } from "@/domain/payment/types";
import type { usePaymentIntentPolling } from "./usePaymentIntentPolling";
import { t } from "@/infrastructure/i18n/translations";

export type PaymentViewStateKind = "success" | "error" | "pending";

export interface PaymentResolvedViewState {
  kind: PaymentViewStateKind;
  title: string;
  description: string;
  variant: StatusVariant;
  icon: LucideIcon;
  animateIcon?: boolean;
  canRetryVerification?: boolean;
  canRetryPayment?: boolean;
  isUnauthorized?: boolean;
}

export function getErrorContent(
  status: number | null,
  isBalance = false,
): { title: string; description: string } {
  switch (status) {
    case 401:
      return {
        title: t.payments.result.sessionExpiredTitle,
        description: t.payments.errors.unauthorized,
      };
    case 403:
      return {
        title: t.payments.result.errorTitle,
        description: isBalance ? t.payments.errors.balance.forbidden : t.payments.errors.forbidden,
      };
    case 404:
      return {
        title: t.payments.result.errorTitle,
        description: isBalance ? t.payments.errors.balance.notFound : t.payments.errors.notFound,
      };
    case 409:
      return {
        title: t.payments.result.errorTitle,
        description: isBalance ? t.payments.errors.balance.conflict : t.payments.errors.conflict,
      };
    case 500:
    case 504:
      return { title: t.payments.result.errorTitle, description: t.payments.errors.temporary };
    default:
      return { title: t.payments.result.errorTitle, description: t.payments.errors.generic };
  }
}

export function resolvePaymentViewState(
  returnKind: PaymentReturnKind,
  hasResolvedPaymentIntent: boolean,
  paymentIntentId: string | null,
  polling: ReturnType<typeof usePaymentIntentPolling>,
  activePayment?: ActivePayment | null,
): PaymentResolvedViewState {
  if (hasResolvedPaymentIntent && !paymentIntentId) {
    return {
      kind: "error",
      title: t.payments.result.unidentifiedTitle,
      description: t.payments.result.unidentifiedDescription,
      variant: "warning",
      icon: AlertTriangle,
    };
  }

  const isServiceBalance = activePayment?.purpose === "service_balance";

  if (polling.errorStatus !== undefined) {
    const errorContent = getErrorContent(polling.errorStatus, isServiceBalance);
    return {
      kind: "error",
      title: errorContent.title,
      description: errorContent.description,
      variant: "warning",
      icon: AlertTriangle,
      canRetryVerification: polling.errorStatus !== 401 && polling.errorStatus !== 403,
      isUnauthorized: polling.errorStatus === 401,
    };
  }

  if (polling.timedOut) {
    return {
      kind: "pending",
      title: t.payments.result.waitingTitle,
      description: isServiceBalance
        ? t.payments.result.balance.timeoutDescription
        : t.payments.result.timeoutDescription,
      variant: "warning",
      icon: Clock3,
      canRetryVerification: true,
    };
  }

  switch (polling.status) {
    case "paid":
      return {
        kind: "success",
        title: isServiceBalance
          ? t.payments.result.balance.paidTitle
          : t.payments.result.paidTitle,
        description: isServiceBalance
          ? t.payments.result.balance.paidDescription
          : t.payments.result.paidDescription,
        variant: "success",
        icon: CheckCircle2,
      };
    case "rejected":
      return {
        kind: "error",
        title: isServiceBalance
          ? t.payments.result.balance.rejectedTitle
          : t.payments.result.rejectedTitle,
        description: isServiceBalance
          ? t.payments.result.balance.rejectedDescription
          : t.payments.result.rejectedDescription,
        variant: "danger",
        icon: XCircle,
        canRetryPayment: true,
      };
    case "expired":
      return {
        kind: "error",
        title: isServiceBalance
          ? t.payments.result.balance.expiredTitle
          : t.payments.result.expiredTitle,
        description: isServiceBalance
          ? t.payments.result.balance.expiredDescription
          : t.payments.result.expiredDescription,
        variant: "warning",
        icon: AlertTriangle,
        canRetryPayment: true,
      };
    case "checkout_ready":
      return {
        kind: "pending",
        title: t.payments.result.waitingTitle,
        description: t.payments.result.waitingDescription,
        variant: "info",
        icon: Clock3,
        animateIcon: true,
      };
    case "processing":
      return {
        kind: "pending",
        title: t.payments.result.processingTitle,
        description: t.payments.result.processingDescription,
        variant: "info",
        icon: Clock3,
        animateIcon: true,
      };
    default:
      return {
        kind: "pending",
        title: t.payments.result.verifyingTitle,
        description: t.payments.result.returnDescriptions[returnKind],
        variant: "info",
        icon: Clock3,
        animateIcon: true,
      };
  }
}
