"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { t } from "@/infrastructure/i18n/translations";
import { StatusBadge } from "./StatusBadge";

export interface PaymentSuccessViewProps {
  isServiceBalance?: boolean;
}

export function PaymentSuccessView({ isServiceBalance = false }: PaymentSuccessViewProps) {
  const title = isServiceBalance
    ? t.payments.result.balance.paidTitle
    : t.payments.result.paidTitle;

  const description = isServiceBalance
    ? t.payments.result.balance.paidDescription
    : t.payments.result.paidDescription;

  const backLabel = isServiceBalance
    ? t.payments.result.balance.backToServices
    : t.payments.result.backToProposals;

  return (
    <>
      <StatusBadge variant="success" icon={CheckCircle2} />
      <div className="space-y-2.5 max-w-sm sm:max-w-md">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-snug">
          {title}
        </h1>
        <p className="text-sm sm:text-base leading-relaxed text-slate-600">
          {description}
        </p>
      </div>

      <div className="flex w-full flex-col gap-3 pt-2 sm:flex-row sm:justify-center sm:items-center">
        <Button
          asChild
          variant="brandSecondary"
          className="w-full sm:w-auto sm:flex-1 h-11 rounded-xl font-semibold shadow-sm"
        >
          <Link href={ROUTES.consumer.services}>
            {backLabel}
          </Link>
        </Button>
      </div>
    </>
  );
}
