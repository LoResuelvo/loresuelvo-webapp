"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getPaymentIntentAction,
  type GetPaymentIntentResult,
} from "@/app/consumidor/pagos/actions";
import { ROUTES } from "@/lib/routes";
import { resolvePaymentIntentId } from "@/lib/payment-utils";
import { t } from "@/infrastructure/i18n/translations";
import { cn } from "@/lib/utils";
import { usePaymentIntentPolling } from "./usePaymentIntentPolling";

export type PaymentReturnKind = "success" | "pending" | "failure";

type StatusVariant = "info" | "success" | "warning" | "danger";

interface PaymentResultStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
}

interface PaymentResultPageProps {
  returnKind: PaymentReturnKind;
  search?: string;
  storage?: PaymentResultStorage;
  getPaymentIntent?: (paymentIntentId: string) => Promise<GetPaymentIntentResult>;
}

interface PaymentViewState {
  title: string;
  description: string;
  variant: StatusVariant;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  animateIcon?: boolean;
  canRetryVerification?: boolean;
  canRetryPayment?: boolean;
}

const VARIANT_STYLES: Record<StatusVariant, string> = {
  info: "bg-brand-primary/10 text-brand-primary ring-brand-primary/5",
  success: "bg-emerald-50 text-brand-accept ring-emerald-50/60",
  warning: "bg-amber-50 text-amber-600 ring-amber-50/60",
  danger: "bg-rose-50 text-brand-danger ring-rose-50/60",
};

function StatusBadge({
  variant,
  icon: Icon,
  animate = false,
}: {
  variant: StatusVariant;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  animate?: boolean;
}) {
  return (
    <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl ring-8 shadow-sm", VARIANT_STYLES[variant])}>
      <Icon className={cn("h-8 w-8", animate && "animate-pulse")} aria-hidden="true" />
    </div>
  );
}

function getErrorContent(status: number | null): { title: string; description: string } {
  switch (status) {
    case 401:
      return {
        title: t.payments.result.sessionExpiredTitle,
        description: t.payments.errors.unauthorized,
      };
    case 403:
      return { title: t.payments.result.errorTitle, description: t.payments.errors.forbidden };
    case 404:
      return { title: t.payments.result.errorTitle, description: t.payments.errors.notFound };
    case 409:
      return { title: t.payments.result.errorTitle, description: t.payments.errors.conflict };
    case 500:
    case 504:
      return { title: t.payments.result.errorTitle, description: t.payments.errors.temporary };
    default:
      return { title: t.payments.result.errorTitle, description: t.payments.errors.generic };
  }
}

function resolvePaymentViewState(
  returnKind: PaymentReturnKind,
  hasResolvedPaymentIntent: boolean,
  paymentIntentId: string | null,
  polling: ReturnType<typeof usePaymentIntentPolling>,
): PaymentViewState {
  if (hasResolvedPaymentIntent && !paymentIntentId) {
    return {
      title: t.payments.result.unidentifiedTitle,
      description: t.payments.result.unidentifiedDescription,
      variant: "warning",
      icon: AlertTriangle,
    };
  }

  if (polling.errorStatus !== undefined) {
    const errorContent = getErrorContent(polling.errorStatus);
    return {
      title: errorContent.title,
      description: errorContent.description,
      variant: "warning",
      icon: AlertTriangle,
      canRetryVerification: polling.errorStatus !== 401 && polling.errorStatus !== 403,
    };
  }

  if (polling.timedOut) {
    return {
      title: t.payments.result.waitingTitle,
      description: t.payments.result.timeoutDescription,
      variant: "warning",
      icon: Clock3,
      canRetryVerification: true,
    };
  }

  switch (polling.status) {
    case "paid":
      return {
        title: t.payments.result.paidTitle,
        description: t.payments.result.paidDescription,
        variant: "success",
        icon: CheckCircle2,
      };
    case "rejected":
      return {
        title: t.payments.result.rejectedTitle,
        description: t.payments.result.rejectedDescription,
        variant: "danger",
        icon: XCircle,
        canRetryPayment: true,
      };
    case "expired":
      return {
        title: t.payments.result.expiredTitle,
        description: t.payments.result.expiredDescription,
        variant: "warning",
        icon: AlertTriangle,
        canRetryPayment: true,
      };
    case "checkout_ready":
      return {
        title: t.payments.result.waitingTitle,
        description: t.payments.result.waitingDescription,
        variant: "info",
        icon: Clock3,
        animateIcon: true,
      };
    case "processing":
      return {
        title: t.payments.result.processingTitle,
        description: t.payments.result.processingDescription,
        variant: "info",
        icon: Clock3,
        animateIcon: true,
      };
    default:
      return {
        title: t.payments.result.verifyingTitle,
        description: t.payments.result.returnDescriptions[returnKind],
        variant: "info",
        icon: Clock3,
        animateIcon: true,
      };
  }
}

export function PaymentResultPage({
  returnKind,
  search,
  storage,
  getPaymentIntent = getPaymentIntentAction,
}: PaymentResultPageProps) {
  const router = useRouter();
  const [paymentStorage, setPaymentStorage] = useState<PaymentResultStorage | null>(storage ?? null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(() => storage
    ? resolvePaymentIntentId(search ?? "", storage.getItem("activePayment"))
    : null);
  const [hasResolvedPaymentIntent, setHasResolvedPaymentIntent] = useState(Boolean(storage));

  useEffect(() => {
    const resolvedStorage = storage ?? window.sessionStorage;
    setPaymentStorage(resolvedStorage);
    setPaymentIntentId(resolvePaymentIntentId(
      search ?? window.location.search,
      resolvedStorage.getItem("activePayment"),
    ));
    setHasResolvedPaymentIntent(true);
  }, [search, storage]);

  const handlePaid = useCallback(() => {
    paymentStorage?.removeItem("activePayment");
    router.refresh();
  }, [paymentStorage, router]);

  const polling = usePaymentIntentPolling({
    paymentIntentId,
    getPaymentIntent,
    onPaid: handlePaid,
  });

  const state = resolvePaymentViewState(
    returnKind,
    hasResolvedPaymentIntent,
    paymentIntentId,
    polling,
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100/70 px-4 py-8 sm:py-12">
      <Card
        className="w-full max-w-md sm:max-w-lg rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 p-6 sm:p-8"
        aria-live="polite"
        aria-busy={polling.isLoading}
      >
        <CardContent className="flex flex-col items-center gap-6 p-0 text-center">
          <StatusBadge
            variant={state.variant}
            icon={state.icon}
            animate={state.animateIcon}
          />
          <div className="space-y-2.5 max-w-sm sm:max-w-md">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-snug">
              {state.title}
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-slate-600">
              {state.description}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 pt-2 sm:flex-row sm:justify-center sm:items-center">
            {state.canRetryVerification && (
              <Button
                type="button"
                variant="brand"
                className="w-full sm:w-auto sm:flex-1 h-11 rounded-xl font-semibold shadow-sm"
                onClick={polling.retry}
              >
                {t.payments.result.checkAgain}
              </Button>
            )}
            {polling.errorStatus === 401 && (
              <Button
                asChild
                variant="brand"
                className="w-full sm:w-auto sm:flex-1 h-11 rounded-xl font-semibold shadow-sm"
              >
                <Link href={ROUTES.auth.login}>{t.payments.result.login}</Link>
              </Button>
            )}
            <Button
              asChild
              variant={state.canRetryPayment ? "brand" : "brandSecondary"}
              className="w-full sm:w-auto sm:flex-1 h-11 rounded-xl font-semibold shadow-sm"
            >
              <Link href={ROUTES.consumer.services}>
                {state.canRetryPayment
                  ? t.payments.result.backToProposal
                  : t.payments.result.backToProposals}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
