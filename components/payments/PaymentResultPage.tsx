"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
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
import { usePaymentIntentPolling } from "./usePaymentIntentPolling";

export type PaymentReturnKind = "success" | "pending" | "failure";

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

export function PaymentResultPage({
  returnKind,
  search,
  storage,
  getPaymentIntent = getPaymentIntentAction,
}: PaymentResultPageProps) {
  const router = useRouter();
  const [paymentStorage] = useState<PaymentResultStorage>(() => storage ?? window.sessionStorage);
  const [paymentIntentId] = useState(() => resolvePaymentIntentId(
    search ?? window.location.search,
    paymentStorage.getItem("activePayment"),
  ));
  const handlePaid = useCallback(() => {
    paymentStorage.removeItem("activePayment");
    router.refresh();
  }, [paymentStorage, router]);
  const polling = usePaymentIntentPolling({
    paymentIntentId,
    getPaymentIntent,
    onPaid: handlePaid,
  });

  let title = t.payments.result.verifyingTitle;
  let description = t.payments.result.returnDescriptions[returnKind];
  let icon = <Clock3 className="h-12 w-12 text-brand-primary" aria-hidden="true" />;
  let canRetryVerification = false;
  let canRetryPayment = false;

  if (!paymentIntentId) {
    title = t.payments.result.unidentifiedTitle;
    description = t.payments.result.unidentifiedDescription;
    icon = <AlertTriangle className="h-12 w-12 text-amber-500" aria-hidden="true" />;
  } else if (polling.errorStatus !== undefined) {
    const errorContent = getErrorContent(polling.errorStatus);
    title = errorContent.title;
    description = errorContent.description;
    icon = <AlertTriangle className="h-12 w-12 text-amber-500" aria-hidden="true" />;
    canRetryVerification = polling.errorStatus !== 401 && polling.errorStatus !== 403;
  } else if (polling.timedOut) {
    title = t.payments.result.waitingTitle;
    description = t.payments.result.timeoutDescription;
    canRetryVerification = true;
  } else if (polling.status === "checkout_ready") {
    title = t.payments.result.waitingTitle;
    description = t.payments.result.waitingDescription;
  } else if (polling.status === "processing") {
    title = t.payments.result.processingTitle;
    description = t.payments.result.processingDescription;
  } else if (polling.status === "paid") {
    title = t.payments.result.paidTitle;
    description = t.payments.result.paidDescription;
    icon = <CheckCircle2 className="h-12 w-12 text-brand-accept" aria-hidden="true" />;
  } else if (polling.status === "rejected") {
    title = t.payments.result.rejectedTitle;
    description = t.payments.result.rejectedDescription;
    icon = <XCircle className="h-12 w-12 text-brand-danger" aria-hidden="true" />;
    canRetryPayment = true;
  } else if (polling.status === "expired") {
    title = t.payments.result.expiredTitle;
    description = t.payments.result.expiredDescription;
    icon = <AlertTriangle className="h-12 w-12 text-amber-500" aria-hidden="true" />;
    canRetryPayment = true;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-lg" aria-live="polite" aria-busy={polling.isLoading}>
        <CardContent className="flex flex-col items-center gap-5 text-center">
          {icon}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            <p className="text-sm leading-6 text-slate-600">{description}</p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            {canRetryVerification && (
              <Button type="button" variant="brand" size="full" onClick={polling.retry}>
                {t.payments.result.checkAgain}
              </Button>
            )}
            {polling.errorStatus === 401 && (
              <Button asChild variant="brand" size="full">
                <Link href={ROUTES.auth.login}>{t.payments.result.login}</Link>
              </Button>
            )}
            <Button asChild variant={canRetryPayment ? "brand" : "brandSecondary"} size="full">
              <Link href={ROUTES.consumer.services}>
                {canRetryPayment
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
